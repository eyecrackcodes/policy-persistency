const express = require("express");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, "../build")));

// In-memory storage for actions (in production, use a database)
let actions = [];
let actionIdCounter = 1;

// Email transporter configuration
let emailTransporter = null;

const initializeEmailTransporter = () => {
  try {
    emailTransporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    console.log("Email transporter initialized successfully");
  } catch (error) {
    console.error("Failed to initialize email transporter:", error);
  }
};

// Initialize email on startup
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  initializeEmailTransporter();
}

// N8N Configuration
const N8N_WEBHOOK_BASE_URL =
  process.env.N8N_WEBHOOK_BASE_URL || "http://localhost:5678/webhook";
const N8N_API_KEY = process.env.N8N_API_KEY;

// Helper Functions

const generateActionId = () => {
  return `action_${actionIdCounter++}_${Date.now()}`;
};

const validateAction = (action) => {
  const requiredFields = [
    "type",
    "title",
    "description",
    "priority",
    "dueDate",
  ];
  const missingFields = requiredFields.filter((field) => !action[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  const validPriorities = ["high", "medium", "low"];
  if (!validPriorities.includes(action.priority)) {
    throw new Error(
      `Invalid priority. Must be one of: ${validPriorities.join(", ")}`
    );
  }

  const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
  if (action.status && !validStatuses.includes(action.status)) {
    throw new Error(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }
};

const sendEmail = async (emailData) => {
  if (!emailTransporter) {
    throw new Error("Email transporter not configured");
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: emailData.to,
    cc: emailData.cc,
    bcc: emailData.bcc,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
    attachments: emailData.attachments,
  };

  const result = await emailTransporter.sendMail(mailOptions);
  return result;
};

const triggerN8NWorkflow = async (workflowType, payload) => {
  if (!N8N_WEBHOOK_BASE_URL) {
    throw new Error("N8N webhook URL not configured");
  }

  const webhookUrl = `${N8N_WEBHOOK_BASE_URL}/${workflowType}`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (N8N_API_KEY) {
    headers["Authorization"] = `Bearer ${N8N_API_KEY}`;
  }

  const response = await axios.post(webhookUrl, payload, { headers });
  return response.data;
};

// Email Templates

const generateAgentTrainingEmailTemplate = (data) => {
  const { agentName, nsfCount, policies, managerEmail } = data;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { padding: 20px; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .policy-list { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>🚨 Agent Training Required - High NSF Activity</h2>
      </div>
      
      <div class="content">
        <p>Dear Manager,</p>
        
        <div class="alert">
          <strong>Alert:</strong> Agent <strong>${agentName}</strong> has generated <strong>${nsfCount}</strong> NSF policies in the last 30 days, exceeding our threshold for additional training.
        </div>
        
        <h3>Recommended Actions:</h3>
        <ul>
          <li>Schedule one-on-one training session with ${agentName}</li>
          <li>Review policy application process and verification procedures</li>
          <li>Analyze customer qualification criteria being used</li>
          <li>Implement additional verification steps if necessary</li>
        </ul>
        
        <div class="policy-list">
          <h4>Affected Policies (${policies?.length || 0} total):</h4>
          ${
            policies
              ? policies
                  .slice(0, 10)
                  .map((policy) => `<div>• ${policy}</div>`)
                  .join("")
              : ""
          }
          ${
            policies && policies.length > 10
              ? `<div><em>... and ${
                  policies.length - 10
                } more policies</em></div>`
              : ""
          }
        </div>
        
        <p>Please take action within 7 days to address this pattern and prevent future NSF issues.</p>
        
        <a href="${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/actions" class="button">View Action Details</a>
        
        <p>Best regards,<br>Policy Persistency Tracker System</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    AGENT TRAINING REQUIRED - HIGH NSF ACTIVITY
    
    Dear Manager,
    
    Agent ${agentName} has generated ${nsfCount} NSF policies in the last 30 days, exceeding our threshold for additional training.
    
    Recommended Actions:
    - Schedule one-on-one training session with ${agentName}
    - Review policy application process and verification procedures
    - Analyze customer qualification criteria being used
    - Implement additional verification steps if necessary
    
    Affected Policies (${policies?.length || 0} total):
    ${policies ? policies.slice(0, 10).join(", ") : "None specified"}
    ${
      policies && policies.length > 10
        ? `... and ${policies.length - 10} more policies`
        : ""
    }
    
    Please take action within 7 days to address this pattern.
    
    View details: ${process.env.FRONTEND_URL || "http://localhost:3000"}/actions
    
    Best regards,
    Policy Persistency Tracker System
  `;

  return {
    subject: `🚨 Agent Training Required: ${agentName} - ${nsfCount} NSF Policies`,
    html,
    text,
    to: managerEmail || process.env.DEFAULT_MANAGER_EMAIL,
  };
};

const generateHighValueAlertTemplate = (data) => {
  const { state, policyCount, totalPremium, policies } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { padding: 20px; }
        .highlight { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .policy-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .policy-table th, .policy-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .policy-table th { background-color: #f2f2f2; }
        .button { background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>💰 High-Value Recovery Alert - Immediate Action Required</h2>
      </div>
      
      <div class="content">
        <p>Dear Recovery Team,</p>
        
        <div class="highlight">
          <h3>High-Value Policies Requiring Immediate Attention</h3>
          <ul>
            <li><strong>State:</strong> ${state}</li>
            <li><strong>Policy Count:</strong> ${policyCount}</li>
            <li><strong>Total Premium Value:</strong> ${formatCurrency(
              totalPremium
            )}</li>
            <li><strong>Estimated Recovery Potential:</strong> ${formatCurrency(
              totalPremium * 0.45
            )}</li>
          </ul>
        </div>
        
        <h3>Recommended Recovery Actions:</h3>
        <ul>
          <li>🔥 Priority outbound calling campaign (within 24 hours)</li>
          <li>💰 Personalized retention offers based on policy value</li>
          <li>📋 Flexible payment plan options</li>
          <li>📧 Direct mail with incentives for high-value policies</li>
        </ul>
        
        ${
          policies && policies.length > 0
            ? `
        <h3>Top Priority Policies:</h3>
        <table class="policy-table">
          <thead>
            <tr>
              <th>Policy Number</th>
              <th>Premium</th>
              <th>Product</th>
              <th>Days Since Lapse</th>
            </tr>
          </thead>
          <tbody>
            ${policies
              .slice(0, 10)
              .map(
                (policy) => `
              <tr>
                <td>${policy.policyNumber || "N/A"}</td>
                <td>${formatCurrency(policy.premium || 0)}</td>
                <td>${policy.product || "N/A"}</td>
                <td>${policy.daysSinceLapse || "N/A"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        ${
          policies.length > 10
            ? `<p><em>... and ${
                policies.length - 10
              } additional policies</em></p>`
            : ""
        }
        `
            : ""
        }
        
        <p><strong>⏰ Time Sensitivity:</strong> These policies require immediate action within 3 days to maximize recovery potential.</p>
        
        <a href="${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/actions" class="button">Start Recovery Campaign</a>
        
        <p>Best regards,<br>Policy Persistency Tracker System</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    HIGH-VALUE RECOVERY ALERT - IMMEDIATE ACTION REQUIRED
    
    Dear Recovery Team,
    
    High-Value Policies Requiring Immediate Attention:
    - State: ${state}
    - Policy Count: ${policyCount}
    - Total Premium Value: ${formatCurrency(totalPremium)}
    - Estimated Recovery Potential: ${formatCurrency(totalPremium * 0.45)}
    
    Recommended Recovery Actions:
    - Priority outbound calling campaign (within 24 hours)
    - Personalized retention offers based on policy value
    - Flexible payment plan options
    - Direct mail with incentives for high-value policies
    
    Time Sensitivity: These policies require immediate action within 3 days to maximize recovery potential.
    
    View details: ${process.env.FRONTEND_URL || "http://localhost:3000"}/actions
    
    Best regards,
    Policy Persistency Tracker System
  `;

  return {
    subject: `💰 HIGH-VALUE RECOVERY ALERT: ${state} - ${formatCurrency(
      totalPremium
    )} at Risk`,
    html,
    text,
    to: process.env.RECOVERY_TEAM_EMAIL || process.env.DEFAULT_MANAGER_EMAIL,
  };
};

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    emailConfigured: !!emailTransporter,
    n8nConfigured: !!N8N_WEBHOOK_BASE_URL,
  });
});

// Actions CRUD operations

// Get all actions
app.get("/api/actions", (req, res) => {
  try {
    const { status, priority, type, search } = req.query;
    let filteredActions = [...actions];

    // Apply filters
    if (status && status !== "all") {
      filteredActions = filteredActions.filter(
        (action) => action.status === status
      );
    }

    if (priority && priority !== "all") {
      filteredActions = filteredActions.filter(
        (action) => action.priority === priority
      );
    }

    if (type && type !== "all") {
      filteredActions = filteredActions.filter(
        (action) => action.type === type
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredActions = filteredActions.filter(
        (action) =>
          action.title.toLowerCase().includes(searchLower) ||
          action.description.toLowerCase().includes(searchLower) ||
          (action.agentName &&
            action.agentName.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      success: true,
      data: filteredActions,
      total: filteredActions.length,
    });
  } catch (error) {
    console.error("Error fetching actions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch actions",
      message: error.message,
    });
  }
});

// Create new action
app.post("/api/actions", (req, res) => {
  try {
    const actionData = req.body;

    validateAction(actionData);

    const newAction = {
      id: generateActionId(),
      ...actionData,
      status: actionData.status || "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    actions.push(newAction);

    res.status(201).json({
      success: true,
      data: newAction,
      message: "Action created successfully",
    });
  } catch (error) {
    console.error("Error creating action:", error);
    res.status(400).json({
      success: false,
      error: "Failed to create action",
      message: error.message,
    });
  }
});

// Create multiple actions (batch)
app.post("/api/actions/batch", (req, res) => {
  try {
    const actionsData = req.body.actions;

    if (!Array.isArray(actionsData)) {
      throw new Error("Actions must be an array");
    }

    const newActions = [];
    const errors = [];

    actionsData.forEach((actionData, index) => {
      try {
        validateAction(actionData);

        const newAction = {
          id: generateActionId(),
          ...actionData,
          status: actionData.status || "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        newActions.push(newAction);
      } catch (error) {
        errors.push({ index, error: error.message });
      }
    });

    // Add valid actions to the collection
    actions.push(...newActions);

    res.status(201).json({
      success: true,
      data: newActions,
      errors: errors,
      message: `${newActions.length} actions created successfully${
        errors.length > 0 ? `, ${errors.length} failed` : ""
      }`,
    });
  } catch (error) {
    console.error("Error creating batch actions:", error);
    res.status(400).json({
      success: false,
      error: "Failed to create batch actions",
      message: error.message,
    });
  }
});

// Update action
app.put("/api/actions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const actionIndex = actions.findIndex((action) => action.id === id);

    if (actionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Action not found",
      });
    }

    // Validate update data if it contains type, title, description, priority, or dueDate
    const fieldsToValidate = [
      "type",
      "title",
      "description",
      "priority",
      "dueDate",
    ];
    const hasFieldsToValidate = fieldsToValidate.some((field) =>
      updateData.hasOwnProperty(field)
    );

    if (hasFieldsToValidate) {
      const actionToValidate = { ...actions[actionIndex], ...updateData };
      validateAction(actionToValidate);
    }

    // Update the action
    actions[actionIndex] = {
      ...actions[actionIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: actions[actionIndex],
      message: "Action updated successfully",
    });
  } catch (error) {
    console.error("Error updating action:", error);
    res.status(400).json({
      success: false,
      error: "Failed to update action",
      message: error.message,
    });
  }
});

// Delete action
app.delete("/api/actions/:id", (req, res) => {
  try {
    const { id } = req.params;

    const actionIndex = actions.findIndex((action) => action.id === id);

    if (actionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Action not found",
      });
    }

    const deletedAction = actions.splice(actionIndex, 1)[0];

    res.json({
      success: true,
      data: deletedAction,
      message: "Action deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting action:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete action",
      message: error.message,
    });
  }
});

// Email endpoints

// Send agent training email
app.post("/api/email/agent-training", async (req, res) => {
  try {
    const emailData = generateAgentTrainingEmailTemplate(req.body);
    const result = await sendEmail(emailData);

    res.json({
      success: true,
      data: { messageId: result.messageId },
      message: "Agent training email sent successfully",
    });
  } catch (error) {
    console.error("Error sending agent training email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      message: error.message,
    });
  }
});

// Send high-value alert email
app.post("/api/email/high-value-alert", async (req, res) => {
  try {
    const emailData = generateHighValueAlertTemplate(req.body);
    const result = await sendEmail(emailData);

    res.json({
      success: true,
      data: { messageId: result.messageId },
      message: "High-value alert email sent successfully",
    });
  } catch (error) {
    console.error("Error sending high-value alert email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      message: error.message,
    });
  }
});

// Send custom email
app.post("/api/email/send", async (req, res) => {
  try {
    const { to, subject, html, text, cc, bcc } = req.body;

    if (!to || !subject || (!html && !text)) {
      throw new Error(
        "Missing required email fields: to, subject, and content (html or text)"
      );
    }

    const result = await sendEmail({ to, subject, html, text, cc, bcc });

    res.json({
      success: true,
      data: { messageId: result.messageId },
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Error sending custom email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      message: error.message,
    });
  }
});

// Test email configuration
app.post("/api/email/test", async (req, res) => {
  try {
    if (!emailTransporter) {
      throw new Error("Email transporter not configured");
    }

    const testEmail = {
      to: req.body.to || process.env.EMAIL_USER,
      subject: "Policy Persistency Tracker - Email Test",
      html: "<p>This is a test email from the Policy Persistency Tracker system.</p>",
      text: "This is a test email from the Policy Persistency Tracker system.",
    };

    const result = await sendEmail(testEmail);

    res.json({
      success: true,
      data: { messageId: result.messageId },
      message: "Test email sent successfully",
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send test email",
      message: error.message,
    });
  }
});

// N8N integration endpoints

// Trigger N8N workflow
app.post("/api/n8n/trigger/:workflowType", async (req, res) => {
  try {
    const { workflowType } = req.params;
    const payload = req.body;

    const result = await triggerN8NWorkflow(workflowType, payload);

    res.json({
      success: true,
      data: result,
      message: `N8N workflow ${workflowType} triggered successfully`,
    });
  } catch (error) {
    console.error("Error triggering N8N workflow:", error);
    res.status(500).json({
      success: false,
      error: "Failed to trigger N8N workflow",
      message: error.message,
    });
  }
});

// Test N8N connection
app.post("/api/n8n/test", async (req, res) => {
  try {
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: "Test from Policy Persistency Tracker",
    };

    const result = await triggerN8NWorkflow("test", testPayload);

    res.json({
      success: true,
      data: result,
      message: "N8N connection test successful",
    });
  } catch (error) {
    console.error("Error testing N8N connection:", error);
    res.status(500).json({
      success: false,
      error: "Failed to test N8N connection",
      message: error.message,
    });
  }
});

// Action execution endpoint
app.post("/api/actions/:id/execute", async (req, res) => {
  try {
    const { id } = req.params;
    const { executionType } = req.body; // 'email', 'n8n', or 'both'

    const action = actions.find((a) => a.id === id);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: "Action not found",
      });
    }

    const results = [];

    // Execute email if requested
    if (executionType === "email" || executionType === "both") {
      try {
        let emailData;

        switch (action.type) {
          case "agent_training":
            emailData = generateAgentTrainingEmailTemplate({
              agentName: action.agentName,
              nsfCount: action.nsfCount,
              policies: action.policies,
              managerEmail: action.managerEmail,
            });
            break;
          case "high_value_recovery":
            emailData = generateHighValueAlertTemplate({
              state: action.state,
              policyCount: action.policyCount,
              totalPremium: action.totalPremium,
              policies: action.policies,
            });
            break;
          default:
            throw new Error(
              `No email template available for action type: ${action.type}`
            );
        }

        const emailResult = await sendEmail(emailData);
        results.push({
          type: "email",
          success: true,
          messageId: emailResult.messageId,
        });
      } catch (error) {
        results.push({ type: "email", success: false, error: error.message });
      }
    }

    // Execute N8N workflow if requested
    if (executionType === "n8n" || executionType === "both") {
      try {
        const n8nResult = await triggerN8NWorkflow(action.type, {
          actionId: action.id,
          ...action,
        });
        results.push({ type: "n8n", success: true, data: n8nResult });
      } catch (error) {
        results.push({ type: "n8n", success: false, error: error.message });
      }
    }

    // Update action status
    const actionIndex = actions.findIndex((a) => a.id === id);
    actions[actionIndex] = {
      ...action,
      status: "in_progress",
      executionResults: results,
      lastExecuted: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        action: actions[actionIndex],
        results: results,
      },
      message: "Action executed successfully",
    });
  } catch (error) {
    console.error("Error executing action:", error);
    res.status(500).json({
      success: false,
      error: "Failed to execute action",
      message: error.message,
    });
  }
});

// Configuration endpoints
app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    data: {
      emailConfigured: !!emailTransporter,
      n8nConfigured: !!N8N_WEBHOOK_BASE_URL,
      environment: process.env.NODE_ENV || "development",
    },
  });
});

// Catch-all handler: send back React's index.html file
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build/index.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email configured: ${!!emailTransporter}`);
  console.log(`🔗 N8N configured: ${!!N8N_WEBHOOK_BASE_URL}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
