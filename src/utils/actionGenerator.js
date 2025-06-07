/**
 * Smart Action Generator for Policy Persistency Tracker
 * Generates actionable tasks based on policy data patterns and business rules
 */

export class ActionGenerator {
  constructor() {
    // Business rule thresholds
    this.thresholds = {
      agentTraining: {
        nsfCount: 5, // 5+ NSF policies
        daysSinceIssue: 30, // within 30 days
      },
      highValueRecovery: {
        minPremium: 1500, // $1500+ premium
        maxDaysLapsed: 60, // within 60 days lapsed
      },
      productAnalysis: {
        minNsfCount: 10, // 10+ NSF cases for product
      },
      seasonalAlert: {
        varianceThreshold: 0.3, // 30% variance from historical
      },
    };

    // Priority levels
    this.priorities = {
      HIGH: "high",
      MEDIUM: "medium",
      LOW: "low",
    };

    // Action types
    this.actionTypes = {
      AGENT_TRAINING: "agent_training",
      HIGH_VALUE_RECOVERY: "high_value_recovery",
      PRODUCT_ANALYSIS: "product_analysis",
      SEASONAL_ALERT: "seasonal_alert",
      BATCH_RECOVERY: "batch_recovery",
      UNDERWRITING_REVIEW: "underwriting_review",
    };
  }

  /**
   * Generate all actions based on policy data
   * @param {Array} policies - Array of policy objects
   * @returns {Array} Array of generated actions
   */
  generateActions(policies) {
    if (!policies || policies.length === 0) {
      return [];
    }

    const actions = [];

    try {
      // Agent training actions
      actions.push(...this.generateAgentTrainingActions(policies));

      // High-value recovery actions
      actions.push(...this.generateHighValueRecoveryActions(policies));

      // Product analysis actions
      actions.push(...this.generateProductAnalysisActions(policies));

      // Seasonal alert actions
      actions.push(...this.generateSeasonalAlertActions(policies));

      // Batch recovery actions
      actions.push(...this.generateBatchRecoveryActions(policies));

      // Underwriting review actions
      actions.push(...this.generateUnderwritingReviewActions(policies));

      // Sort by priority and created date
      return this.prioritizeActions(actions);
    } catch (error) {
      console.error("Error generating actions:", error);
      return [];
    }
  }

  /**
   * Generate agent training actions for agents with multiple NSF policies
   */
  generateAgentTrainingActions(policies) {
    const actions = [];
    const agentNsfCounts = this.groupPoliciesByAgent(policies);
    const currentDate = new Date();

    Object.entries(agentNsfCounts).forEach(([agentId, agentData]) => {
      const recentNsfCount = agentData.policies.filter((policy) => {
        const issueDate = new Date(policy.issue_date);
        const daysSinceIssue =
          (currentDate - issueDate) / (1000 * 60 * 60 * 24);
        return daysSinceIssue <= this.thresholds.agentTraining.daysSinceIssue;
      }).length;

      if (recentNsfCount >= this.thresholds.agentTraining.nsfCount) {
        actions.push({
          id: `agent_training_${agentId}_${Date.now()}`,
          type: this.actionTypes.AGENT_TRAINING,
          priority: this.priorities.HIGH,
          title: `Agent Training Required: ${agentData.name}`,
          description: `Agent has ${recentNsfCount} NSF policies in the last 30 days`,
          agentId: agentId,
          agentName: agentData.name,
          nsfCount: recentNsfCount,
          totalPremium: agentData.policies.reduce(
            (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
            0
          ),
          policies: agentData.policies.map((p) => p.policy_nbr),
          status: "pending",
          createdAt: new Date().toISOString(),
          dueDate: this.calculateDueDate(7), // 1 week
          estimatedImpact: this.calculateEstimatedImpact(agentData.policies),
          recommendedActions: [
            "Schedule one-on-one training session",
            "Review policy application process",
            "Analyze customer qualification criteria",
            "Implement additional verification steps",
          ],
        });
      }
    });

    return actions;
  }

  /**
   * Generate high-value recovery actions for valuable lapsed policies
   */
  generateHighValueRecoveryActions(policies) {
    const actions = [];
    const currentDate = new Date();

    const highValueLapsed = policies.filter((policy) => {
      const premium = parseFloat(policy.annual_premium) || 0;
      const issueDate = new Date(policy.issue_date);
      const paidToDate = new Date(policy.paid_to_date);
      const daysSinceLapse = (currentDate - paidToDate) / (1000 * 60 * 60 * 24);

      return (
        premium >= this.thresholds.highValueRecovery.minPremium &&
        daysSinceLapse <= this.thresholds.highValueRecovery.maxDaysLapsed
      );
    });

    // Group by state for batch processing
    const stateGroups = this.groupPoliciesByState(highValueLapsed);

    Object.entries(stateGroups).forEach(([state, statePolicies]) => {
      if (statePolicies.length > 0) {
        const totalPremium = statePolicies.reduce(
          (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
          0
        );

        actions.push({
          id: `high_value_recovery_${state}_${Date.now()}`,
          type: this.actionTypes.HIGH_VALUE_RECOVERY,
          priority: this.priorities.HIGH,
          title: `High-Value Recovery Campaign: ${state}`,
          description: `${
            statePolicies.length
          } high-value policies (${this.formatCurrency(
            totalPremium
          )}) require immediate attention`,
          state: state,
          policyCount: statePolicies.length,
          totalPremium: totalPremium,
          policies: statePolicies.map((p) => ({
            policyNumber: p.policy_nbr,
            premium: parseFloat(p.annual_premium) || 0,
            product: p.Product,
            daysSinceLapse: Math.round(
              (new Date() - new Date(p.paid_to_date)) / (1000 * 60 * 60 * 24)
            ),
          })),
          status: "pending",
          createdAt: new Date().toISOString(),
          dueDate: this.calculateDueDate(3), // 3 days
          estimatedImpact: this.calculateRecoveryImpact(statePolicies),
          recommendedActions: [
            "Priority outbound calling campaign",
            "Personalized retention offers",
            "Payment plan options",
            "Direct mail with incentives",
          ],
        });
      }
    });

    return actions;
  }

  /**
   * Generate product analysis actions for products with high NSF rates
   */
  generateProductAnalysisActions(policies) {
    const actions = [];
    const productGroups = this.groupPoliciesByProduct(policies);

    Object.entries(productGroups).forEach(([product, productPolicies]) => {
      if (
        productPolicies.length >= this.thresholds.productAnalysis.minNsfCount
      ) {
        const nsfRate = this.calculateNsfRate(productPolicies);
        const avgDaysToNsf = this.calculateAverageDaysToNsf(productPolicies);

        actions.push({
          id: `product_analysis_${product.replace(/\s+/g, "_")}_${Date.now()}`,
          type: this.actionTypes.PRODUCT_ANALYSIS,
          priority:
            nsfRate > 0.15 ? this.priorities.HIGH : this.priorities.MEDIUM,
          title: `Product Analysis Required: ${product}`,
          description: `${productPolicies.length} NSF cases (${(
            nsfRate * 100
          ).toFixed(1)}% rate) require review`,
          product: product,
          nsfCount: productPolicies.length,
          nsfRate: nsfRate,
          avgDaysToNsf: avgDaysToNsf,
          totalPremiumAtRisk: productPolicies.reduce(
            (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
            0
          ),
          status: "pending",
          createdAt: new Date().toISOString(),
          dueDate: this.calculateDueDate(14), // 2 weeks
          estimatedImpact: this.calculateProductImpact(productPolicies),
          recommendedActions: [
            "Analyze underwriting criteria",
            "Review pricing strategy",
            "Examine distribution channels",
            "Assess payment collection process",
            "Consider product modifications",
          ],
          insights: this.generateProductInsights(productPolicies),
        });
      }
    });

    return actions;
  }

  /**
   * Generate seasonal alert actions based on patterns
   */
  generateSeasonalAlertActions(policies) {
    const actions = [];
    const monthlyData = this.groupPoliciesByMonth(policies);
    const seasonalPatterns = this.detectSeasonalPatterns(monthlyData);

    seasonalPatterns.forEach((pattern) => {
      if (pattern.variance > this.thresholds.seasonalAlert.varianceThreshold) {
        actions.push({
          id: `seasonal_alert_${pattern.period}_${Date.now()}`,
          type: this.actionTypes.SEASONAL_ALERT,
          priority: this.priorities.MEDIUM,
          title: `Seasonal Risk Alert: ${pattern.description}`,
          description: `${(pattern.variance * 100).toFixed(
            1
          )}% increase in NSF rates detected`,
          period: pattern.period,
          variance: pattern.variance,
          affectedPolicies: pattern.policyCount,
          historicalAverage: pattern.historicalAverage,
          currentRate: pattern.currentRate,
          status: "pending",
          createdAt: new Date().toISOString(),
          dueDate: this.calculateDueDate(5), // 5 days
          estimatedImpact: pattern.estimatedImpact,
          recommendedActions: [
            "Implement seasonal prevention measures",
            "Adjust collection timing",
            "Enhance customer communication",
            "Prepare targeted retention campaigns",
          ],
        });
      }
    });

    return actions;
  }

  /**
   * Generate batch recovery actions for similar policy groups
   */
  generateBatchRecoveryActions(policies) {
    const actions = [];
    const batchGroups = this.identifyBatchGroups(policies);

    batchGroups.forEach((group) => {
      if (group.policies.length >= 5) {
        // Minimum batch size
        actions.push({
          id: `batch_recovery_${group.key}_${Date.now()}`,
          type: this.actionTypes.BATCH_RECOVERY,
          priority: this.priorities.MEDIUM,
          title: `Batch Recovery: ${group.description}`,
          description: `${group.policies.length} similar policies identified for batch processing`,
          batchKey: group.key,
          batchType: group.type,
          policyCount: group.policies.length,
          totalPremium: group.totalPremium,
          commonAttributes: group.commonAttributes,
          policies: group.policies.map((p) => p.policy_nbr),
          status: "pending",
          createdAt: new Date().toISOString(),
          dueDate: this.calculateDueDate(10), // 10 days
          estimatedImpact: this.calculateBatchImpact(group.policies),
          recommendedActions: [
            "Create targeted communication templates",
            "Implement batch processing workflow",
            "Coordinate multi-channel outreach",
            "Track batch success metrics",
          ],
        });
      }
    });

    return actions;
  }

  /**
   * Generate underwriting review actions for concerning patterns
   */
  generateUnderwritingReviewActions(policies) {
    const actions = [];
    const underwritingIssues = this.identifyUnderwritingIssues(policies);

    underwritingIssues.forEach((issue) => {
      actions.push({
        id: `underwriting_review_${issue.type}_${Date.now()}`,
        type: this.actionTypes.UNDERWRITING_REVIEW,
        priority:
          issue.severity === "high"
            ? this.priorities.HIGH
            : this.priorities.MEDIUM,
        title: `Underwriting Review: ${issue.title}`,
        description: issue.description,
        issueType: issue.type,
        severity: issue.severity,
        affectedPolicies: issue.policies.length,
        riskFactors: issue.riskFactors,
        policies: issue.policies.map((p) => p.policy_nbr),
        status: "pending",
        createdAt: new Date().toISOString(),
        dueDate: this.calculateDueDate(21), // 3 weeks
        estimatedImpact: issue.estimatedImpact,
        recommendedActions: issue.recommendedActions,
      });
    });

    return actions;
  }

  // Helper methods for data grouping and analysis

  groupPoliciesByAgent(policies) {
    const agentGroups = {};

    policies.forEach((policy) => {
      const agentId = policy.WA || "unknown";
      const agentName = policy.WA_Name || "Unknown Agent";

      if (!agentGroups[agentId]) {
        agentGroups[agentId] = {
          id: agentId,
          name: agentName,
          policies: [],
        };
      }

      agentGroups[agentId].policies.push(policy);
    });

    return agentGroups;
  }

  groupPoliciesByState(policies) {
    const stateGroups = {};

    policies.forEach((policy) => {
      const state = policy.issue_state || "Unknown";

      if (!stateGroups[state]) {
        stateGroups[state] = [];
      }

      stateGroups[state].push(policy);
    });

    return stateGroups;
  }

  groupPoliciesByProduct(policies) {
    const productGroups = {};

    policies.forEach((policy) => {
      const product = policy.Product || "Unknown";

      if (!productGroups[product]) {
        productGroups[product] = [];
      }

      productGroups[product].push(policy);
    });

    return productGroups;
  }

  groupPoliciesByMonth(policies) {
    const monthlyGroups = {};

    policies.forEach((policy) => {
      const issueDate = new Date(policy.issue_date);
      const monthKey = `${issueDate.getFullYear()}-${String(
        issueDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = [];
      }

      monthlyGroups[monthKey].push(policy);
    });

    return monthlyGroups;
  }

  // Calculation helper methods

  calculateDueDate(daysFromNow) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate.toISOString();
  }

  calculateEstimatedImpact(policies) {
    const totalPremium = policies.reduce(
      (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
      0
    );
    const recoveryRate = 0.35; // Estimated 35% recovery rate

    return {
      potentialRecovery: totalPremium * recoveryRate,
      timeToComplete: Math.ceil(policies.length / 10), // 10 policies per day
      confidenceLevel: this.calculateConfidenceLevel(policies),
    };
  }

  calculateRecoveryImpact(policies) {
    const totalPremium = policies.reduce(
      (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
      0
    );
    const highValueRecoveryRate = 0.45; // Higher recovery rate for high-value policies

    return {
      potentialRecovery: totalPremium * highValueRecoveryRate,
      priorityScore: this.calculatePriorityScore(policies),
      expectedTimeframe: "3-7 days",
    };
  }

  calculateProductImpact(policies) {
    return {
      riskReduction: policies.length * 0.2, // Estimated risk reduction
      premiumProtection:
        policies.reduce(
          (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
          0
        ) * 0.8,
      processImprovement: "Medium",
    };
  }

  calculateBatchImpact(policies) {
    return {
      efficiencyGain: policies.length * 0.15,
      costSavings: policies.length * 25, // $25 per policy in batch processing savings
      timeReduction: "40%",
    };
  }

  calculateNsfRate(policies) {
    // This would typically compare against total policies issued
    // For now, we'll use a simplified calculation
    return Math.min(policies.length / 100, 1); // Assume 100 policies is 100% NSF rate
  }

  calculateAverageDaysToNsf(policies) {
    const totalDays = policies.reduce((sum, policy) => {
      const issueDate = new Date(policy.issue_date);
      const paidToDate = new Date(policy.paid_to_date);
      const days = (paidToDate - issueDate) / (1000 * 60 * 60 * 24);
      return sum + (days > 0 ? days : 0);
    }, 0);

    return Math.round(totalDays / policies.length);
  }

  calculateConfidenceLevel(policies) {
    // Simple confidence calculation based on data completeness and pattern consistency
    const completenessScore = this.calculateDataCompleteness(policies);
    const consistencyScore = this.calculatePatternConsistency(policies);

    return (completenessScore + consistencyScore) / 2;
  }

  calculateDataCompleteness(policies) {
    const requiredFields = [
      "policy_nbr",
      "annual_premium",
      "issue_date",
      "paid_to_date",
    ];
    let completeCount = 0;

    policies.forEach((policy) => {
      const complete = requiredFields.every(
        (field) => policy[field] && policy[field] !== ""
      );
      if (complete) completeCount++;
    });

    return completeCount / policies.length;
  }

  calculatePatternConsistency(policies) {
    // Simplified consistency check - in reality this would be more sophisticated
    return 0.75; // Placeholder value
  }

  calculatePriorityScore(policies) {
    const premiumWeight = 0.4;
    const recencyWeight = 0.3;
    const volumeWeight = 0.3;

    const avgPremium =
      policies.reduce(
        (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
        0
      ) / policies.length;
    const avgRecency = this.calculateAverageRecency(policies);
    const volume = policies.length;

    return (
      (avgPremium / 1000) * premiumWeight +
      avgRecency * recencyWeight +
      Math.min(volume / 10, 1) * volumeWeight
    );
  }

  calculateAverageRecency(policies) {
    const currentDate = new Date();
    const totalDays = policies.reduce((sum, policy) => {
      const paidToDate = new Date(policy.paid_to_date);
      const days = (currentDate - paidToDate) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    const avgDays = totalDays / policies.length;
    return Math.max(0, 1 - avgDays / 365); // Convert to 0-1 scale where newer = higher
  }

  // Advanced analysis methods

  detectSeasonalPatterns(monthlyData) {
    const patterns = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Compare current month to same month in previous years
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}`;
    const currentMonthData = monthlyData[currentMonthKey] || [];

    // Look for historical data for the same month
    const historicalData = [];
    for (let year = currentYear - 3; year < currentYear; year++) {
      const historicalKey = `${year}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}`;
      if (monthlyData[historicalKey]) {
        historicalData.push(monthlyData[historicalKey]);
      }
    }

    if (historicalData.length > 0 && currentMonthData.length > 0) {
      const historicalAvg =
        historicalData.reduce((sum, data) => sum + data.length, 0) /
        historicalData.length;
      const currentCount = currentMonthData.length;
      const variance = (currentCount - historicalAvg) / historicalAvg;

      if (
        Math.abs(variance) > this.thresholds.seasonalAlert.varianceThreshold
      ) {
        patterns.push({
          period: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`,
          description: `${new Date(currentYear, currentMonth).toLocaleString(
            "default",
            { month: "long" }
          )} ${currentYear}`,
          variance: variance,
          policyCount: currentCount,
          historicalAverage: historicalAvg,
          currentRate: currentCount,
          estimatedImpact: {
            affectedPolicies: currentCount,
            potentialLoss: currentCount * 2000, // Estimated $2000 per additional NSF
            recommendedBudget: Math.abs(variance) * historicalAvg * 100, // $100 per excess NSF for prevention
          },
        });
      }
    }

    return patterns;
  }

  identifyBatchGroups(policies) {
    const batchGroups = [];

    // Group by common attributes for batch processing
    const groups = {
      // By state and product
      stateProduct: {},
      // By premium range
      premiumRange: {},
      // By days since lapse
      lapseRange: {},
      // By NSF reason
      reason: {},
    };

    policies.forEach((policy) => {
      // State + Product grouping
      const stateProductKey = `${policy.issue_state}_${policy.Product}`;
      if (!groups.stateProduct[stateProductKey]) {
        groups.stateProduct[stateProductKey] = [];
      }
      groups.stateProduct[stateProductKey].push(policy);

      // Premium range grouping
      const premium = parseFloat(policy.annual_premium) || 0;
      const premiumRange = Math.floor(premium / 500) * 500; // Group by $500 ranges
      const premiumKey = `${premiumRange}-${premiumRange + 499}`;
      if (!groups.premiumRange[premiumKey]) {
        groups.premiumRange[premiumKey] = [];
      }
      groups.premiumRange[premiumKey].push(policy);

      // Days since lapse grouping
      const daysSinceLapse = Math.floor(
        (new Date() - new Date(policy.paid_to_date)) / (1000 * 60 * 60 * 24)
      );
      const lapseRange = Math.floor(daysSinceLapse / 30) * 30; // Group by 30-day ranges
      const lapseKey = `${lapseRange}-${lapseRange + 29}`;
      if (!groups.lapseRange[lapseKey]) {
        groups.lapseRange[lapseKey] = [];
      }
      groups.lapseRange[lapseKey].push(policy);

      // Reason grouping
      const reason = policy.Reason || "Unknown";
      if (!groups.reason[reason]) {
        groups.reason[reason] = [];
      }
      groups.reason[reason].push(policy);
    });

    // Convert groups to batch actions
    Object.entries(groups).forEach(([groupType, typeGroups]) => {
      Object.entries(typeGroups).forEach(([key, groupPolicies]) => {
        if (groupPolicies.length >= 5) {
          // Minimum batch size
          const totalPremium = groupPolicies.reduce(
            (sum, p) => sum + (parseFloat(p.annual_premium) || 0),
            0
          );

          batchGroups.push({
            key: `${groupType}_${key}`,
            type: groupType,
            description: this.getBatchDescription(groupType, key),
            policies: groupPolicies,
            totalPremium: totalPremium,
            commonAttributes: this.extractCommonAttributes(
              groupPolicies,
              groupType
            ),
          });
        }
      });
    });

    return batchGroups;
  }

  identifyUnderwritingIssues(policies) {
    const issues = [];

    // High NSF rate by agent
    const agentGroups = this.groupPoliciesByAgent(policies);
    Object.entries(agentGroups).forEach(([agentId, agentData]) => {
      if (agentData.policies.length >= 10) {
        // Minimum volume for statistical significance
        const nsfRate = agentData.policies.length / 50; // Assume 50 total policies per agent
        if (nsfRate > 0.2) {
          // 20% NSF rate threshold
          issues.push({
            type: "high_nsf_agent",
            title: `High NSF Rate - Agent ${agentData.name}`,
            description: `Agent has ${(nsfRate * 100).toFixed(1)}% NSF rate (${
              agentData.policies.length
            } NSF policies)`,
            severity: nsfRate > 0.3 ? "high" : "medium",
            policies: agentData.policies,
            riskFactors: [
              "Above-average NSF rate",
              "Pattern suggests underwriting issues",
              "Potential training needed",
            ],
            estimatedImpact: {
              futureRisk: agentData.policies.length * 2, // Estimated future NSF policies
              trainingCost: 2000,
              potentialSavings: agentData.policies.length * 1000,
            },
            recommendedActions: [
              "Comprehensive agent training review",
              "Audit recent applications",
              "Implement enhanced oversight",
              "Review underwriting authority levels",
            ],
          });
        }
      }
    });

    // Product-specific issues
    const productGroups = this.groupPoliciesByProduct(policies);
    Object.entries(productGroups).forEach(([product, productPolicies]) => {
      if (productPolicies.length >= 15) {
        const avgDaysToNsf = this.calculateAverageDaysToNsf(productPolicies);
        if (avgDaysToNsf < 45) {
          // Very early NSF
          issues.push({
            type: "early_nsf_product",
            title: `Early NSF Pattern - ${product}`,
            description: `Product shows NSF within ${avgDaysToNsf} days on average`,
            severity: avgDaysToNsf < 30 ? "high" : "medium",
            policies: productPolicies,
            riskFactors: [
              "Unusually early NSF pattern",
              "Possible underwriting criteria issues",
              "Payment collection timing concerns",
            ],
            estimatedImpact: {
              affectedNewPolicies: productPolicies.length * 0.5,
              reviewCost: 5000,
              potentialSavings: productPolicies.length * 800,
            },
            recommendedActions: [
              "Review product underwriting criteria",
              "Analyze payment collection timing",
              "Assess distribution channel quality",
              "Consider product design modifications",
            ],
          });
        }
      }
    });

    return issues;
  }

  // Utility helper methods

  getBatchDescription(groupType, key) {
    switch (groupType) {
      case "stateProduct":
        const [state, product] = key.split("_");
        return `${product} policies in ${state}`;
      case "premiumRange":
        return `Policies with $${key} premium range`;
      case "lapseRange":
        return `Policies lapsed ${key} days ago`;
      case "reason":
        return `Policies with "${key}" NSF reason`;
      default:
        return `Batch group: ${key}`;
    }
  }

  extractCommonAttributes(policies, groupType) {
    const attributes = {};

    switch (groupType) {
      case "stateProduct":
        attributes.state = policies[0].issue_state;
        attributes.product = policies[0].Product;
        break;
      case "premiumRange":
        const premiums = policies.map((p) => parseFloat(p.annual_premium) || 0);
        attributes.minPremium = Math.min(...premiums);
        attributes.maxPremium = Math.max(...premiums);
        break;
      case "lapseRange":
        const daysArray = policies.map((p) =>
          Math.floor(
            (new Date() - new Date(p.paid_to_date)) / (1000 * 60 * 60 * 24)
          )
        );
        attributes.minDaysLapsed = Math.min(...daysArray);
        attributes.maxDaysLapsed = Math.max(...daysArray);
        break;
      case "reason":
        attributes.nsfReason = policies[0].Reason;
        break;
    }

    return attributes;
  }

  generateProductInsights(policies) {
    const insights = [];

    // Premium distribution insight
    const premiums = policies.map((p) => parseFloat(p.annual_premium) || 0);
    const avgPremium =
      premiums.reduce((sum, p) => sum + p, 0) / premiums.length;
    insights.push(`Average premium: ${this.formatCurrency(avgPremium)}`);

    // Geographic distribution
    const states = [...new Set(policies.map((p) => p.issue_state))];
    insights.push(`Affected states: ${states.join(", ")}`);

    // Timing patterns
    const avgDays = this.calculateAverageDaysToNsf(policies);
    insights.push(`Average days to NSF: ${avgDays}`);

    // Top NSF reasons
    const reasons = {};
    policies.forEach((p) => {
      const reason = p.Reason || "Unknown";
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
    if (topReason) {
      insights.push(
        `Most common reason: ${topReason[0]} (${topReason[1]} cases)`
      );
    }

    return insights;
  }

  prioritizeActions(actions) {
    // Sort by priority, then by potential impact, then by due date
    return actions.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // Then by estimated impact (if available)
      const aImpact = a.estimatedImpact?.potentialRecovery || 0;
      const bImpact = b.estimatedImpact?.potentialRecovery || 0;
      const impactDiff = bImpact - aImpact;

      if (impactDiff !== 0) return impactDiff;

      // Finally by due date (earliest first)
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

export default ActionGenerator;
