// Retention team configuration
const RETENTION_TEAM = {
  "Mark Vallejo": {
    phone: process.env.REACT_APP_MARK_PHONE,
    email: "mark@company.com",
    specialties: ["high-value", "commercial"],
    capacity: 15,
  },
  "Monica Archuleta": {
    phone: process.env.REACT_APP_MONICA_PHONE,
    email: "monica@company.com",
    specialties: ["nsf", "payment-issues"],
    capacity: 20,
  },
  "Stephen Brown": {
    phone: process.env.REACT_APP_STEPHEN_PHONE,
    email: "stephen@company.com",
    specialties: ["cancellation", "retention"],
    capacity: 18,
  },

};

class TaskDistributionService {
  constructor() {
    this.distributionStrategies = {
      ROUND_ROBIN: "round_robin",
      LOAD_BALANCED: "load_balanced",
      SPECIALTY_FIRST: "specialty_first",
      PRIORITY_WEIGHTED: "priority_weighted",
      HYBRID: "hybrid",
    };

    this.currentStrategy = this.distributionStrategies.HYBRID;
    this.lastAssignedIndex = 0;
  }

  // Main task distribution method
  distributeTask(task, existingTasks = [], strategy = null) {
    const activeStrategy = strategy || this.currentStrategy;

    switch (activeStrategy) {
      case this.distributionStrategies.ROUND_ROBIN:
        return this.roundRobinAssignment(task);
      case this.distributionStrategies.LOAD_BALANCED:
        return this.loadBalancedAssignment(task, existingTasks);
      case this.distributionStrategies.SPECIALTY_FIRST:
        return this.specialtyFirstAssignment(task, existingTasks);
      case this.distributionStrategies.PRIORITY_WEIGHTED:
        return this.priorityWeightedAssignment(task, existingTasks);
      case this.distributionStrategies.HYBRID:
        return this.hybridAssignment(task, existingTasks);
      default:
        return this.hybridAssignment(task, existingTasks);
    }
  }

  // Round Robin - Simple rotation through team members
  roundRobinAssignment(task) {
    const teamMembers = Object.keys(RETENTION_TEAM);
    const assignedMember =
      teamMembers[this.lastAssignedIndex % teamMembers.length];
    this.lastAssignedIndex++;
    return assignedMember;
  }

  // Load Balanced - Assign to team member with lowest current workload
  loadBalancedAssignment(task, existingTasks) {
    const workloadAnalysis = this.analyzeCurrentWorkload(existingTasks);
    const availableMembers = this.getAvailableMembers(workloadAnalysis);

    if (availableMembers.length === 0) {
      // If everyone is at capacity, assign to lowest workload
      return this.getLeastLoadedMember(workloadAnalysis);
    }

    // Assign to available member with lowest workload
    return availableMembers[0].name;
  }

  // Specialty First - Prioritize team members with matching specialties
  specialtyFirstAssignment(task, existingTasks) {
    const workloadAnalysis = this.analyzeCurrentWorkload(existingTasks);
    const specialtyMatches = this.findSpecialtyMatches(task);

    // Among specialty matches, choose least loaded
    const availableSpecialists = specialtyMatches.filter((member) => {
      const workload = workloadAnalysis[member];
      return workload.utilizationPercent < 100;
    });

    if (availableSpecialists.length > 0) {
      return this.getLeastLoadedFromList(
        availableSpecialists,
        workloadAnalysis
      );
    }

    // If no specialists available, fall back to load balancing
    return this.loadBalancedAssignment(task, existingTasks);
  }

  // Priority Weighted - Higher priority tasks go to more experienced/available members
  priorityWeightedAssignment(task, existingTasks) {
    const workloadAnalysis = this.analyzeCurrentWorkload(existingTasks);
    const scores = this.calculateMemberScores(task, workloadAnalysis);

    // Sort by score (highest first) and return best match
    const sortedMembers = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);

    return sortedMembers[0];
  }

  // Hybrid - Combines specialty matching with load balancing and priority weighting
  hybridAssignment(task, existingTasks) {
    const workloadAnalysis = this.analyzeCurrentWorkload(existingTasks);
    const specialtyMatches = this.findSpecialtyMatches(task);

    // Calculate hybrid scores for all members
    const hybridScores = {};

    Object.keys(RETENTION_TEAM).forEach((member) => {
      const workload = workloadAnalysis[member];
      const isSpecialist = specialtyMatches.includes(member);
      const priorityMultiplier = this.getPriorityMultiplier(task.priority);

      // Base score starts with availability (inverse of utilization)
      let score = Math.max(0, 100 - workload.utilizationPercent);

      // Specialty bonus
      if (isSpecialist) {
        score += 50;
      }

      // High-value policy bonus for Mark (high-value specialist)
      if (member === "Mark Vallejo" && task.premium >= 5000) {
        score += 30;
      }

      // Priority weighting
      score *= priorityMultiplier;

      // Penalty for overloaded members
      if (workload.utilizationPercent > 100) {
        score *= 0.5; // 50% penalty for overloaded
      }

      if (workload.utilizationPercent > 150) {
        score *= 0.3; // Additional penalty for severely overloaded
      }

      hybridScores[member] = score;
    });

    // Return member with highest hybrid score
    return Object.entries(hybridScores)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name)[0];
  }

  // Analyze current workload across team
  analyzeCurrentWorkload(existingTasks) {
    const analysis = {};

    Object.keys(RETENTION_TEAM).forEach((member) => {
      const memberTasks = existingTasks.filter(
        (task) => task.assignedTo === member && task.status === "open"
      );

      const capacity = RETENTION_TEAM[member].capacity;
      const assigned = memberTasks.length;
      const utilizationPercent = (assigned / capacity) * 100;

      // Calculate priority distribution
      const highPriority = memberTasks.filter(
        (t) => t.priority === "high"
      ).length;
      const mediumPriority = memberTasks.filter(
        (t) => t.priority === "medium"
      ).length;
      const lowPriority = memberTasks.filter(
        (t) => t.priority === "low"
      ).length;

      // Calculate average premium
      const totalPremium = memberTasks.reduce(
        (sum, task) => sum + (task.premium || 0),
        0
      );
      const avgPremium =
        memberTasks.length > 0 ? totalPremium / memberTasks.length : 0;

      analysis[member] = {
        name: member,
        capacity,
        assigned,
        utilizationPercent,
        available: Math.max(0, capacity - assigned),
        tasks: {
          high: highPriority,
          medium: mediumPriority,
          low: lowPriority,
          total: memberTasks.length,
        },
        avgPremium,
        totalPremium,
        specialties: RETENTION_TEAM[member].specialties,
      };
    });

    return analysis;
  }

  // Find team members with matching specialties for a task
  findSpecialtyMatches(task) {
    const matches = [];

    Object.entries(RETENTION_TEAM).forEach(([member, data]) => {
      const specialties = data.specialties;

      // Check task type matches
      if (task.type.includes("nsf") && specialties.includes("nsf")) {
        matches.push(member);
      }
      if (
        task.type.includes("cancellation") &&
        specialties.includes("cancellation")
      ) {
        matches.push(member);
      }
      if (
        task.type.includes("retention") &&
        specialties.includes("retention")
      ) {
        matches.push(member);
      }
      if (task.premium >= 5000 && specialties.includes("high-value")) {
        matches.push(member);
      }
      if (
        task.type.includes("payment") &&
        specialties.includes("payment-issues")
      ) {
        matches.push(member);
      }
      if (
        task.type.includes("commercial") &&
        specialties.includes("commercial")
      ) {
        matches.push(member);
      }
    });

    return [...new Set(matches)]; // Remove duplicates
  }

  // Get available team members (under capacity)
  getAvailableMembers(workloadAnalysis) {
    return Object.values(workloadAnalysis)
      .filter((member) => member.utilizationPercent < 100)
      .sort((a, b) => a.utilizationPercent - b.utilizationPercent);
  }

  // Get least loaded team member
  getLeastLoadedMember(workloadAnalysis) {
    return Object.values(workloadAnalysis).sort(
      (a, b) => a.utilizationPercent - b.utilizationPercent
    )[0].name;
  }

  // Get least loaded member from a specific list
  getLeastLoadedFromList(memberList, workloadAnalysis) {
    return memberList
      .map((name) => workloadAnalysis[name])
      .sort((a, b) => a.utilizationPercent - b.utilizationPercent)[0].name;
  }

  // Calculate priority multiplier
  getPriorityMultiplier(priority) {
    switch (priority) {
      case "high":
        return 1.5;
      case "medium":
        return 1.0;
      case "low":
        return 0.8;
      default:
        return 1.0;
    }
  }

  // Calculate member scores for priority weighted assignment
  calculateMemberScores(task, workloadAnalysis) {
    const scores = {};

    Object.keys(RETENTION_TEAM).forEach((member) => {
      const workload = workloadAnalysis[member];
      const isSpecialist = this.findSpecialtyMatches(task).includes(member);

      // Base score: availability
      let score = workload.available;

      // Specialty bonus
      if (isSpecialist) score += 10;

      // Priority bonus for high-priority tasks
      if (task.priority === "high") score += 5;

      // Premium bonus for high-value policies
      if (task.premium >= 5000) score += 3;

      scores[member] = Math.max(0, score);
    });

    return scores;
  }

  // Redistribute tasks to balance workload
  redistributeTasks(existingTasks, maxImbalancePercent = 50) {
    const workloadAnalysis = this.analyzeCurrentWorkload(existingTasks);
    const redistributions = [];

    // Find overloaded and underloaded members
    const overloaded = Object.values(workloadAnalysis)
      .filter((member) => member.utilizationPercent > 100 + maxImbalancePercent)
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    const underloaded = Object.values(workloadAnalysis)
      .filter((member) => member.utilizationPercent < 100 - maxImbalancePercent)
      .sort((a, b) => a.utilizationPercent - b.utilizationPercent);

    // Redistribute tasks from overloaded to underloaded
    overloaded.forEach((overloadedMember) => {
      const memberTasks = existingTasks.filter(
        (task) =>
          task.assignedTo === overloadedMember.name && task.status === "open"
      );

      // Sort tasks by priority (move low priority first)
      const sortedTasks = memberTasks.sort((a, b) => {
        const priorityOrder = { low: 1, medium: 2, high: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Move tasks to underloaded members
      let tasksToMove = Math.floor(overloadedMember.assigned * 0.2); // Move 20% of tasks

      sortedTasks.slice(0, tasksToMove).forEach((task) => {
        const bestTarget = this.findBestRedistributionTarget(
          task,
          underloaded,
          workloadAnalysis
        );

        if (bestTarget) {
          redistributions.push({
            taskId: task.id,
            from: overloadedMember.name,
            to: bestTarget,
            reason: "Load balancing",
          });

          // Update workload analysis for next iteration
          workloadAnalysis[overloadedMember.name].assigned--;
          workloadAnalysis[bestTarget].assigned++;
        }
      });
    });

    return redistributions;
  }

  // Find best target for task redistribution
  findBestRedistributionTarget(task, underloadedMembers, workloadAnalysis) {
    const specialtyMatches = this.findSpecialtyMatches(task);

    // Prefer specialty matches among underloaded members
    const underloadedSpecialists = underloadedMembers.filter((member) =>
      specialtyMatches.includes(member.name)
    );

    if (underloadedSpecialists.length > 0) {
      return underloadedSpecialists[0].name;
    }

    // Otherwise, assign to least loaded
    return underloadedMembers.length > 0 ? underloadedMembers[0].name : null;
  }

  // Generate distribution report
  generateDistributionReport(existingTasks) {
    const workloadAnalysis = this.analyzeCurrentWorkload(existingTasks);
    const redistributionSuggestions = this.redistributeTasks(existingTasks);

    const report = {
      timestamp: new Date(),
      strategy: this.currentStrategy,
      teamSummary: {
        totalTasks: existingTasks.filter((t) => t.status === "open").length,
        averageUtilization:
          Object.values(workloadAnalysis).reduce(
            (sum, member) => sum + member.utilizationPercent,
            0
          ) / Object.keys(workloadAnalysis).length,
        balanceScore: this.calculateBalanceScore(workloadAnalysis),
      },
      members: workloadAnalysis,
      redistributionSuggestions,
      recommendations: this.generateRecommendations(workloadAnalysis),
    };

    return report;
  }

  // Calculate balance score (0-100, where 100 is perfectly balanced)
  calculateBalanceScore(workloadAnalysis) {
    const utilizations = Object.values(workloadAnalysis).map(
      (m) => m.utilizationPercent
    );
    const avg =
      utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    const variance =
      utilizations.reduce((sum, u) => sum + Math.pow(u - avg, 2), 0) /
      utilizations.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert to 0-100 score (lower deviation = higher score)
    return Math.max(0, 100 - standardDeviation);
  }

  // Generate recommendations for better distribution
  generateRecommendations(workloadAnalysis) {
    const recommendations = [];

    Object.values(workloadAnalysis).forEach((member) => {
      if (member.utilizationPercent > 150) {
        recommendations.push({
          type: "overload_critical",
          member: member.name,
          message: `${
            member.name
          } is critically overloaded at ${member.utilizationPercent.toFixed(
            1
          )}%. Consider redistributing tasks or increasing capacity.`,
          priority: "high",
        });
      } else if (member.utilizationPercent > 100) {
        recommendations.push({
          type: "overload_warning",
          member: member.name,
          message: `${
            member.name
          } is over capacity at ${member.utilizationPercent.toFixed(
            1
          )}%. Monitor workload closely.`,
          priority: "medium",
        });
      } else if (member.utilizationPercent < 50) {
        recommendations.push({
          type: "underutilized",
          member: member.name,
          message: `${
            member.name
          } is underutilized at ${member.utilizationPercent.toFixed(
            1
          )}%. Consider assigning more tasks.`,
          priority: "low",
        });
      }
    });

    return recommendations;
  }

  // Set distribution strategy
  setDistributionStrategy(strategy) {
    if (Object.values(this.distributionStrategies).includes(strategy)) {
      this.currentStrategy = strategy;
      return true;
    }
    return false;
  }

  // Get current strategy
  getCurrentStrategy() {
    return this.currentStrategy;
  }

  // Get available strategies
  getAvailableStrategies() {
    return this.distributionStrategies;
  }
}

export { RETENTION_TEAM };
export const taskDistributionService = new TaskDistributionService();
export default TaskDistributionService;
