import { supabase } from "../config/supabase";
import { taskDistributionService, RETENTION_TEAM } from "./taskDistributionService";

class TaskService {
  constructor() {
    // Remove SMS/Twilio functionality
    this.notificationHistory = new Map(); // Track task assignments for reporting
  }

  // Analyze policy data to generate actionable tasks
  async generateRetentionTasks(policies) {
    const tasks = [];
    const now = new Date();

    for (const policy of policies) {
      // High-priority NSF policies (recent, high premium)
      if (policy.source === "nsf" && policy.annual_premium >= 5000) {
        const daysSinceIssue = Math.floor(
          (now - new Date(policy.issue_date)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceIssue <= 30) {
          tasks.push({
            id: `nsf-${policy.policy_nbr}`,
            type: "urgent_nsf_follow_up",
            priority: "high",
            policyNumber: policy.policy_nbr,
            customerName: policy.agent_name,
            premium: policy.annual_premium,
            issueDate: policy.issue_date,
            description: `Urgent NSF follow-up for high-value policy ($${policy.annual_premium.toLocaleString()})`,
            suggestedActions: [
              "Contact customer within 24 hours",
              "Offer payment plan options", 
              "Verify updated payment information",
              "Document conversation in CRM",
            ],
            assignedTo: await this.assignTask(
              "nsf",
              policy.annual_premium,
              "high"
            ),
            dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Due in 24 hours
            estimatedDuration: "30 minutes",
            createdAt: now,
            policy: policy, // Include full policy data for contact panel
          });
        }
      }

      // Cancellation retention opportunities
      if (policy.source === "cancellation" && policy.duration <= 90) {
        tasks.push({
          id: `retention-${policy.policy_nbr}`,
          type: "early_cancellation_retention",
          priority: policy.annual_premium >= 3000 ? "high" : "medium",
          policyNumber: policy.policy_nbr,
          customerName: policy.agent_name,
          premium: policy.annual_premium,
          reason: policy.termination_reason,
          duration: policy.duration,
          description: `Early cancellation retention opportunity - ${policy.duration} days`,
          suggestedActions: [
            "Call customer to understand cancellation reason",
            "Offer retention incentives if applicable",
            "Address specific concerns",
            "Document retention attempt",
          ],
          assignedTo: await this.assignTask(
            "cancellation",
            policy.annual_premium,
            policy.annual_premium >= 3000 ? "high" : "medium"
          ),
          dueDate: new Date(now.getTime() + 48 * 60 * 60 * 1000), // Due in 48 hours
          estimatedDuration: "45 minutes",
          createdAt: now,
          policy: policy, // Include full policy data for contact panel
        });
      }

      // Premium recovery for long-running NSF cases
      if (policy.source === "nsf" && policy.duration > 60) {
        tasks.push({
          id: `recovery-${policy.policy_nbr}`,
          type: "premium_recovery",
          priority: "medium",
          policyNumber: policy.policy_nbr,
          customerName: policy.agent_name,
          premium: policy.annual_premium,
          duration: policy.duration,
          description: `Premium recovery for extended NSF case (${policy.duration} days)`,
          suggestedActions: [
            "Review payment history",
            "Contact customer for payment arrangement",
            "Consider policy restoration options",
            "Update collection status",
          ],
          assignedTo: await this.assignTask(
            "recovery",
            policy.annual_premium,
            "medium"
          ),
          dueDate: new Date(now.getTime() + 72 * 60 * 60 * 1000), // Due in 72 hours
          estimatedDuration: "20 minutes",
          createdAt: now,
          policy: policy, // Include full policy data for contact panel
        });
      }
    }

    return tasks.sort((a, b) => {
      // Sort by priority and due date
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  // Intelligent task assignment using distribution service
  async assignTask(taskType, premium = 0, priority = "medium") {
    try {
      const existingTasks = await this.getExistingTasks();

      // Create a mock task for assignment algorithm
      const mockTask = {
        type: taskType,
        premium: premium,
        priority: priority,
      };

      // Use task distribution service for intelligent assignment
      const assignedMember = taskDistributionService.distributeTask(
        mockTask,
        existingTasks
      );

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🎯 Task assigned to ${assignedMember} using ${taskDistributionService.getCurrentStrategy()} strategy`
        );
      }

      // Track assignment for reporting
      this.notificationHistory.set(Date.now(), {
        assignedTo: assignedMember,
        taskType: taskType,
        premium: premium,
        priority: priority,
        timestamp: new Date()
      });

      return assignedMember;
    } catch (error) {
      console.error("Error in intelligent task assignment:", error);

      // Fallback to simple assignment
      return this.fallbackAssignTask(taskType, premium);
    }
  }

  // Fallback assignment method (original logic)
  fallbackAssignTask(taskType, premium = 0) {
    const teamMembers = Object.keys(RETENTION_TEAM);

    // Find best match based on specialties
    let bestMatch = teamMembers[0];

    for (const member of teamMembers) {
      const memberData = RETENTION_TEAM[member];

      // Check if member specializes in this task type
      if (memberData.specialties.includes(taskType)) {
        bestMatch = member;
        break;
      }

      // For high-value accounts, prefer members with "high-value" specialty
      if (premium >= 5000 && memberData.specialties.includes("high-value")) {
        bestMatch = member;
        break;
      }
    }

    return bestMatch;
  }

  // Get existing tasks from database
  async getExistingTasks() {
    try {
      // Check if supabase is available
      if (!supabase) {
        console.warn(
          "Supabase client not available, using fallback assignment"
        );
        return [];
      }

      const { data, error } = await supabase
        .from("retention_tasks")
        .select("*")
        .eq("status", "open");

      if (error) {
        console.warn(
          "Database query failed, using fallback assignment:",
          error.message
        );
        return [];
      }

      // Convert database format to expected format
      return (data || []).map((task) => ({
        id: task.task_id,
        type: task.type,
        priority: task.priority,
        premium: task.premium,
        assignedTo: task.assigned_to,
        status: task.status,
      }));
    } catch (error) {
      console.warn(
        "Error fetching existing tasks, using fallback assignment:",
        error.message
      );
      return []; // Return empty array as fallback
    }
  }

  // Save task to database
  async saveTask(task) {
    try {
      const { data, error } = await supabase
        .from("retention_tasks")
        .upsert({
          task_id: task.id,
          type: task.type,
          priority: task.priority,
          policy_number: task.policyNumber,
          customer_name: task.customerName,
          premium: task.premium,
          description: task.description,
          suggested_actions: task.suggestedActions,
          assigned_to: task.assignedTo,
          due_date: task.dueDate,
          estimated_duration: task.estimatedDuration,
          status: "open",
          created_at: task.createdAt,
        }, { 
          onConflict: 'task_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        // Only log errors that aren't duplicate key issues
        if (error.code !== '23505') {
          console.error("Error saving task:", error);
        }
        return null;
      }
      return data;
    } catch (error) {
      // Only log errors that aren't duplicate key issues
      if (error.code !== '23505') {
        console.error("Error saving task:", error);
      }
      return null;
    }
  }

  // Get team workload distribution
  getTeamWorkload(tasks) {
    const workload = {};

    Object.keys(RETENTION_TEAM).forEach((member) => {
      workload[member] = {
        assigned: tasks.filter((task) => task.assignedTo === member).length,
        capacity: RETENTION_TEAM[member].capacity,
        utilization: 0,
      };

      workload[member].utilization =
        (workload[member].assigned / workload[member].capacity) * 100;
    });

    return workload;
  }

  // Generate team performance report
  generateTeamReport(tasks, completedTasks = []) {
    const report = {
      overview: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        completionRate: (completedTasks.length / tasks.length) * 100,
        averageResponseTime: "2.5 hours", // Calculate from actual data
      },
      teamMetrics: {},
      priorities: {
        high: tasks.filter((t) => t.priority === "high").length,
        medium: tasks.filter((t) => t.priority === "medium").length,
        low: tasks.filter((t) => t.priority === "low").length,
      },
    };

    Object.keys(RETENTION_TEAM).forEach((member) => {
      const memberTasks = tasks.filter((t) => t.assignedTo === member);
      const memberCompleted = completedTasks.filter(
        (t) => t.assignedTo === member
      );

      report.teamMetrics[member] = {
        assigned: memberTasks.length,
        completed: memberCompleted.length,
        completionRate:
          memberTasks.length > 0
            ? (memberCompleted.length / memberTasks.length) * 100
            : 0,
        specialties: RETENTION_TEAM[member].specialties,
        capacity: RETENTION_TEAM[member].capacity,
      };
    });

    return report;
  }

  // Get assignment history for reporting
  getAssignmentHistory() {
    return Array.from(this.notificationHistory.values());
  }
}

export const taskService = new TaskService();
export { RETENTION_TEAM }; 