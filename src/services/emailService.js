import axios from "axios";

class EmailService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || "http://localhost:3001";
  }

  // Email templates for different scenarios
  getEmailTemplate(type, data) {
    const templates = {
      agent_training: {
        subject: `Training Required - NSF Policy Analysis for ${data.agent}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px;">
              🎯 Agent Training Required
            </h2>
            
            <p>Dear ${data.agent},</p>
            
            <p>Our policy persistency analysis has identified that you have <strong>${
              data.count
            } policies</strong> 
            that experienced NSF issues with an average duration of <strong>${
              data.avgDuration
            } days</strong>.</p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">🚨 Key Metrics</h3>
              <ul style="margin: 0;">
                <li>NSF Policy Count: ${data.count}</li>
                <li>Average Duration: ${data.avgDuration} days</li>
                <li>Total Premium Impact: $${
                  data.totalPremium?.toLocaleString() || "N/A"
                }</li>
              </ul>
            </div>
            
            <p>This indicates an opportunity to improve client onboarding and payment setup processes. 
            Please schedule time with your manager to review:</p>
            
            <ol>
              <li><strong>Payment method verification procedures</strong> - Ensure clients have reliable payment methods</li>
              <li><strong>Client financial stability assessment</strong> - Better screening during application</li>
              <li><strong>Premium payment education</strong> - Clear communication about payment schedules</li>
              <li><strong>Follow-up processes</strong> - Proactive outreach before NSF occurs</li>
            </ol>
            
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">💡 Recommended Actions</h4>
              <p>Schedule a meeting with your team lead within the next 5 business days to discuss 
              improvement strategies and additional training opportunities.</p>
            </div>
            
            <p>Best regards,<br>
            <strong>Policy Management Team</strong><br>
            GTL Insurance</p>
          </div>
        `,
        text: `
Dear ${data.agent},

Our policy persistency analysis has identified that you have ${data.count} policies that experienced NSF issues with an average duration of ${data.avgDuration} days.

This indicates an opportunity to improve client onboarding and payment setup processes. Please schedule time with your manager to review:

1. Payment method verification procedures
2. Client financial stability assessment  
3. Premium payment education
4. Follow-up processes

Best regards,
Policy Management Team
        `,
      },

      high_value_alert: {
        subject: `🚨 High-Value Policy Alert - ${data.policyNumber} ($${data.premium})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
              🚨 High-Value Policy Lapse Alert
            </h2>
            
            <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #991b1b; margin-top: 0;">Policy Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Policy Number:</td>
                  <td style="padding: 5px 0;">${data.policyNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Annual Premium:</td>
                  <td style="padding: 5px 0; color: #dc2626; font-weight: bold;">$${data.premium?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Duration:</td>
                  <td style="padding: 5px 0;">${data.duration} days</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Agent:</td>
                  <td style="padding: 5px 0;">${data.agent}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">NSF Reason:</td>
                  <td style="padding: 5px 0;">${data.reason}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; font-weight: bold;">Issue State:</td>
                  <td style="padding: 5px 0;">${data.state}</td>
                </tr>
              </table>
            </div>
            
            <p><strong>IMMEDIATE ACTION REQUIRED:</strong> This high-value policy requires immediate 
            attention for potential recovery or process improvement analysis.</p>
            
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">🎯 Next Steps</h4>
              <ol style="margin: 0;">
                <li>Review agent performance and training needs</li>
                <li>Analyze payment method used and failure reason</li>
                <li>Consider policy recovery outreach</li>
                <li>Update underwriting guidelines if needed</li>
              </ol>
            </div>
            
            <p>This alert was generated automatically by the Policy Persistency Tracker system.</p>
            
            <p>Best regards,<br>
            <strong>Risk Management Team</strong></p>
          </div>
        `,
        text: `
HIGH-VALUE POLICY LAPSE ALERT

Policy Details:
- Policy Number: ${data.policyNumber}
- Annual Premium: $${data.premium?.toLocaleString()}
- Duration: ${data.duration} days
- Agent: ${data.agent}
- NSF Reason: ${data.reason}
- Issue State: ${data.state}

IMMEDIATE ACTION REQUIRED: This high-value policy requires immediate attention for potential recovery or process improvement analysis.

Best regards,
Risk Management Team
        `,
      },

      product_analysis: {
        subject: `📊 Product Performance Alert - ${data.product} (${data.count} NSF cases)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c2d12; border-bottom: 2px solid #7c2d12; padding-bottom: 10px;">
              📊 Product Performance Analysis Required
            </h2>
            
            <p>Our analysis has identified a concerning trend with the <strong>${data.product}</strong> product line.</p>
            
            <div style="background-color: #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #9a3412; margin-top: 0;">📈 Performance Metrics</h3>
              <ul style="margin: 0;">
                <li><strong>Total NSF Cases:</strong> ${data.count}</li>
                <li><strong>Top NSF Reason:</strong> ${data.topReason}</li>
                <li><strong>Analysis Period:</strong> Last 90 days</li>
              </ul>
            </div>
            
            <p>This product line has exceeded the threshold for NSF cases and requires immediate analysis.</p>
            
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #065f46; margin-top: 0;">🔍 Recommended Analysis Areas</h4>
              <ol style="margin: 0;">
                <li><strong>Underwriting Guidelines:</strong> Review current underwriting criteria</li>
                <li><strong>Premium Structure:</strong> Analyze pricing vs. risk factors</li>
                <li><strong>Payment Methods:</strong> Evaluate accepted payment types</li>
                <li><strong>Agent Training:</strong> Product-specific training needs</li>
                <li><strong>Customer Demographics:</strong> Target market analysis</li>
              </ol>
            </div>
            
            <p>Please coordinate with the product development team to schedule a comprehensive review 
            within the next 10 business days.</p>
            
            <p>Best regards,<br>
            <strong>Product Analytics Team</strong></p>
          </div>
        `,
        text: `
PRODUCT PERFORMANCE ANALYSIS REQUIRED

Product: ${data.product}
Total NSF Cases: ${data.count}
Top NSF Reason: ${data.topReason}

This product line has exceeded the threshold for NSF cases and requires immediate analysis.

Recommended Analysis Areas:
1. Underwriting Guidelines
2. Premium Structure  
3. Payment Methods
4. Agent Training
5. Customer Demographics

Please coordinate with the product development team for a comprehensive review.

Best regards,
Product Analytics Team
        `,
      },

      seasonal_alert: {
        subject: `📅 Seasonal Risk Alert - ${data.season} Pattern Detected`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c2d12; border-bottom: 2px solid #7c2d12; padding-bottom: 10px;">
              📅 Seasonal Risk Pattern Alert
            </h2>
            
            <p>Our trending analysis has detected a seasonal risk pattern for <strong>${data.season}</strong>.</p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">📊 Pattern Details</h3>
              <ul style="margin: 0;">
                <li><strong>Risk Period:</strong> ${data.season}</li>
                <li><strong>Expected Increase:</strong> ${data.expectedIncrease}%</li>
                <li><strong>Historical Pattern:</strong> ${data.historicalPattern}</li>
              </ul>
            </div>
            
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1e40af; margin-top: 0;">🛡️ Preventive Measures</h4>
              <ol style="margin: 0;">
                <li><strong>Enhanced Screening:</strong> Implement stricter underwriting during this period</li>
                <li><strong>Payment Reminders:</strong> Increase proactive payment reminder frequency</li>
                <li><strong>Agent Alerts:</strong> Notify agents about seasonal risk factors</li>
                <li><strong>Premium Adjustments:</strong> Consider temporary premium modifications</li>
              </ol>
            </div>
            
            <p>This alert is based on historical NSF data patterns and machine learning predictions.</p>
            
            <p>Best regards,<br>
            <strong>Predictive Analytics Team</strong></p>
          </div>
        `,
        text: `
SEASONAL RISK PATTERN ALERT

Risk Period: ${data.season}
Expected Increase: ${data.expectedIncrease}%
Historical Pattern: ${data.historicalPattern}

Preventive Measures:
1. Enhanced Screening
2. Payment Reminders
3. Agent Alerts  
4. Premium Adjustments

This alert is based on historical NSF data patterns and ML predictions.

Best regards,
Predictive Analytics Team
        `,
      },
    };

    return (
      templates[type] || {
        subject: "Policy Management Notification",
        html: "<p>Default notification message</p>",
        text: "Default notification message",
      }
    );
  }

  // Send email via backend API
  async sendEmail(type, data) {
    try {
      const template = this.getEmailTemplate(type, data);

      const payload = {
        type,
        template,
        data,
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(
        `${this.baseURL}/api/send-email`,
        payload
      );

      if (response.data.success) {
        console.log(`Email sent successfully: ${type}`);
        return response.data;
      } else {
        throw new Error(response.data.error || "Email sending failed");
      }
    } catch (error) {
      console.error("Email service error:", error);
      throw new Error(`Failed to send ${type} email: ${error.message}`);
    }
  }

  // Batch send emails
  async sendBatchEmails(emails) {
    try {
      const payload = {
        emails,
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(
        `${this.baseURL}/api/send-batch-emails`,
        payload
      );
      return response.data;
    } catch (error) {
      console.error("Batch email service error:", error);
      throw new Error(`Failed to send batch emails: ${error.message}`);
    }
  }

  // Test email configuration
  async testEmailConfig() {
    try {
      const response = await axios.get(`${this.baseURL}/api/test-email`);
      return response.data;
    } catch (error) {
      console.error("Email config test error:", error);
      throw new Error(`Email configuration test failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default EmailService;
