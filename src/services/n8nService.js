import axios from "axios";

class N8NService {
  constructor() {
    this.baseURL =
      process.env.REACT_APP_N8N_WEBHOOK_URL ||
      "https://your-n8n-instance.com/webhook";
    this.apiKey = process.env.REACT_APP_N8N_API_KEY;
    this.timeout = 30000; // 30 seconds timeout
  }

  // Workflow types and their configurations
  getWorkflowConfig(workflowType) {
    const workflows = {
      policy_recovery: {
        webhook: `${this.baseURL}/policy-recovery`,
        description: "Automated policy recovery workflow",
        requiredFields: ["policyNumber", "premium", "agent", "reason"],
        priority: "high",
      },

      agent_performance_review: {
        webhook: `${this.baseURL}/agent-performance`,
        description: "Agent performance analysis and training workflow",
        requiredFields: ["agent", "nsfCount", "avgDuration", "totalPremium"],
        priority: "medium",
      },

      product_analysis: {
        webhook: `${this.baseURL}/product-analysis`,
        description: "Product performance analysis workflow",
        requiredFields: ["product", "nsfCount", "topReason"],
        priority: "medium",
      },

      high_value_alert: {
        webhook: `${this.baseURL}/high-value-alert`,
        description: "High-value policy immediate attention workflow",
        requiredFields: ["policyNumber", "premium", "duration", "agent"],
        priority: "critical",
      },

      seasonal_risk: {
        webhook: `${this.baseURL}/seasonal-risk`,
        description: "Seasonal risk pattern mitigation workflow",
        requiredFields: ["season", "riskLevel", "affectedProducts"],
        priority: "medium",
      },

      batch_training: {
        webhook: `${this.baseURL}/batch-training`,
        description: "Batch agent training initiation workflow",
        requiredFields: ["agents", "trainingType", "metrics"],
        priority: "low",
      },

      underwriting_review: {
        webhook: `${this.baseURL}/underwriting-review`,
        description: "Underwriting process review workflow",
        requiredFields: ["criteria", "policies", "recommendations"],
        priority: "high",
      },

      customer_outreach: {
        webhook: `${this.baseURL}/customer-outreach`,
        description: "Automated customer retention outreach",
        requiredFields: ["customers", "outreachType", "timeline"],
        priority: "medium",
      },
    };

    return workflows[workflowType] || null;
  }

  // Validate required fields for workflow
  validateWorkflowData(workflowType, data) {
    const config = this.getWorkflowConfig(workflowType);
    if (!config) {
      throw new Error(`Unknown workflow type: ${workflowType}`);
    }

    const missingFields = config.requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields for ${workflowType}: ${missingFields.join(
          ", "
        )}`
      );
    }

    return true;
  }

  // Format workflow payload
  formatWorkflowPayload(workflowType, data, metadata = {}) {
    const config = this.getWorkflowConfig(workflowType);

    return {
      workflowType,
      priority: config.priority,
      description: config.description,
      timestamp: new Date().toISOString(),
      source: "policy-persistency-tracker",
      data: {
        ...data,
        // Add common metadata
        submittedBy: metadata.user || "system",
        submissionTime: new Date().toISOString(),
        sessionId: metadata.sessionId || this.generateSessionId(),
        version: "1.0",
      },
      callbacks: {
        success: `${window.location.origin}/api/n8n-callback/success`,
        error: `${window.location.origin}/api/n8n-callback/error`,
        progress: `${window.location.origin}/api/n8n-callback/progress`,
      },
    };
  }

  // Generate unique session ID
  generateSessionId() {
    return `ppt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Trigger single workflow
  async triggerWorkflow(workflowType, data, metadata = {}) {
    try {
      // Validate workflow type and data
      this.validateWorkflowData(workflowType, data);

      const config = this.getWorkflowConfig(workflowType);
      const payload = this.formatWorkflowPayload(workflowType, data, metadata);

      console.log(`Triggering N8N workflow: ${workflowType}`, payload);

      const response = await axios.post(config.webhook, payload, {
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": this.apiKey,
          "User-Agent": "Policy-Persistency-Tracker/1.0",
        },
      });

      // Check if response indicates success
      if (response.status >= 200 && response.status < 300) {
        console.log(
          `N8N workflow ${workflowType} triggered successfully:`,
          response.data
        );

        return {
          success: true,
          workflowType,
          executionId: response.data.executionId || response.data.id,
          status: response.data.status || "triggered",
          message: response.data.message || "Workflow triggered successfully",
          data: response.data,
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error(`N8N workflow ${workflowType} trigger failed:`, error);

      // Handle different types of errors
      if (error.code === "ECONNABORTED") {
        throw new Error(
          `Workflow ${workflowType} timeout - check N8N server availability`
        );
      } else if (error.response) {
        const errorMsg =
          error.response.data?.message ||
          error.response.statusText ||
          "Unknown server error";
        throw new Error(
          `Workflow ${workflowType} failed: ${errorMsg} (Status: ${error.response.status})`
        );
      } else if (error.request) {
        throw new Error(
          `Workflow ${workflowType} failed: Unable to reach N8N server`
        );
      } else {
        throw new Error(`Workflow ${workflowType} failed: ${error.message}`);
      }
    }
  }

  // Trigger multiple workflows in sequence
  async triggerWorkflowBatch(workflows) {
    const results = [];

    for (const workflow of workflows) {
      try {
        const result = await this.triggerWorkflow(
          workflow.type,
          workflow.data,
          workflow.metadata
        );
        results.push(result);

        // Add delay between workflows to prevent overwhelming N8N
        if (workflows.length > 1) {
          await this.delay(1000); // 1 second delay
        }
      } catch (error) {
        results.push({
          success: false,
          workflowType: workflow.type,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      batchSuccess: results.every((r) => r.success),
      totalWorkflows: workflows.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      results,
    };
  }

  // Get workflow status (if N8N provides status endpoints)
  async getWorkflowStatus(executionId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/status/${executionId}`,
        {
          headers: {
            "X-N8N-API-KEY": this.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.warn("Unable to get workflow status:", error.message);
      return { status: "unknown", message: "Status endpoint not available" };
    }
  }

  // Test N8N connection
  async testConnection() {
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        source: "policy-persistency-tracker",
      };

      const response = await axios.post(`${this.baseURL}/test`, testPayload, {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": this.apiKey,
        },
      });

      return {
        success: true,
        status: response.status,
        message: "N8N connection successful",
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "N8N connection failed",
      };
    }
  }

  // Get available workflows
  getAvailableWorkflows() {
    const workflows = [
      "policy_recovery",
      "agent_performance_review",
      "product_analysis",
      "high_value_alert",
      "seasonal_risk",
      "batch_training",
      "underwriting_review",
      "customer_outreach",
    ];

    return workflows.map((type) => ({
      type,
      ...this.getWorkflowConfig(type),
    }));
  }

  // Utility function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Predefined workflow templates
  createPolicyRecoveryWorkflow(policy) {
    return {
      type: "policy_recovery",
      data: {
        policyNumber: policy.policy_nbr,
        premium: policy.annual_premium,
        agent: policy.WA_Name,
        reason: policy.Reason,
        duration: policy.duration,
        state: policy.issue_state,
        product: policy.Product,
        issueDate: policy.issue_date,
        mgaName: policy.MGA_name,
      },
      metadata: {
        priority: policy.annual_premium > 1500 ? "critical" : "high",
        category: "recovery",
      },
    };
  }

  createAgentPerformanceWorkflow(agentData) {
    return {
      type: "agent_performance_review",
      data: {
        agent: agentData.name,
        nsfCount: agentData.count,
        avgDuration: agentData.avgDuration,
        totalPremium: agentData.totalPremium,
        recommendations: agentData.recommendations || [],
      },
      metadata: {
        priority: agentData.count >= 10 ? "high" : "medium",
        category: "training",
      },
    };
  }

  createProductAnalysisWorkflow(productData) {
    return {
      type: "product_analysis",
      data: {
        product: productData.name,
        nsfCount: productData.count,
        topReason: productData.topReason,
        affectedStates: productData.states || [],
        trendData: productData.trends || {},
      },
      metadata: {
        priority: productData.count >= 20 ? "high" : "medium",
        category: "analysis",
      },
    };
  }
}

// Export singleton instance
export const n8nService = new N8NService();
export default N8NService;
