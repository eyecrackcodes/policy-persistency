import React, { useState, useEffect } from "react";
import useDeviceDetect from "../hooks/useDeviceDetect";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Calendar,
  Filter,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  User,
  Target,
  Activity,
  Settings,
  ExternalLink,
} from "lucide-react";
import { taskService, RETENTION_TEAM } from "../services/taskService";
import TaskDistributionControls from "./TaskDistributionControls";

const TaskDashboard = ({ tasks = [], onTaskUpdate }) => {
  const { isMobile } = useDeviceDetect();
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedTeamMember, setSelectedTeamMember] = useState("all");
  const [taskStats, setTaskStats] = useState({});
  const [teamWorkload, setTeamWorkload] = useState({});
  const [expandedTask, setExpandedTask] = useState(null);
  const [viewMode, setViewMode] = useState("tasks"); // "tasks" or "distribution"

  useEffect(() => {
    calculateTaskStats();
    calculateTeamWorkload();
  }, [tasks]);

  const calculateTaskStats = () => {
    const tasksArray = Array.isArray(tasks) ? tasks : [];
    const stats = {
      total: tasksArray.length,
      high: tasksArray.filter((t) => t.priority === "high").length,
      medium: tasksArray.filter((t) => t.priority === "medium").length,
      low: tasksArray.filter((t) => t.priority === "low").length,
      overdue: tasksArray.filter((t) => new Date(t.dueDate) < new Date())
        .length,
      dueToday: tasksArray.filter((t) => {
        const due = new Date(t.dueDate);
        const today = new Date();
        return due.toDateString() === today.toDateString();
      }).length,
    };
    setTaskStats(stats);
  };

  const calculateTeamWorkload = () => {
    const workload = taskService.getTeamWorkload(tasksArray);
    setTeamWorkload(workload);
  };

  const tasksArray = Array.isArray(tasks) ? tasks : [];
  const filteredTasks = tasksArray.filter((task) => {
    const priorityMatch =
      selectedFilter === "all" || task.priority === selectedFilter;
    const teamMatch =
      selectedTeamMember === "all" || task.assignedTo === selectedTeamMember;
    return priorityMatch && teamMatch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const formatDueDate = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return `${Math.abs(diffHours)}h overdue`;
    if (diffHours < 24) return `${diffHours}h remaining`;

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d remaining`;
  };

  const TaskCard = ({ task }) => {
    const isExpanded = expandedTask === task.id;
    const isOverdue = new Date(task.dueDate) < new Date();

    return (
      <div
        className={`
        border rounded-lg p-4 mb-3 transition-all duration-200
        ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}
        ${isMobile ? "text-sm" : ""}
        hover:shadow-md cursor-pointer
      `}
      >
        <div
          className="flex items-center justify-between"
          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
        >
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-lg">{getPriorityIcon(task.priority)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-semibold text-gray-900 truncate">
                  {task.policyNumber}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600 text-sm truncate">
                {task.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <span
              className={`text-xs ${
                isOverdue ? "text-red-600 font-semibold" : "text-gray-500"
              }`}
            >
              {formatDueDate(task.dueDate)}
            </span>
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Assigned to</p>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{task.assignedTo}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Premium</p>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    ${task.premium?.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Estimated Duration</p>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{task.estimatedDuration}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Due Date</p>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Suggested Actions</p>
              <ul className="space-y-1">
                {task.suggestedActions?.map((action, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              {/* Primary Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleTaskAction(task, "call")}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call Customer</span>
                </button>
                <button
                  onClick={() => handleTaskAction(task, "message")}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
                <button
                  onClick={() => handleTaskAction(task, "complete")}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Mark Complete</span>
                </button>
              </div>
              
              {/* Secondary Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => window.open(`https://ams.digitalbga.com/search?q=${encodeURIComponent(task.policyNumber)}`, '_blank')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors flex-1"
                  title={`View policy ${task.policyNumber} in AMS`}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View in AMS</span>
                </button>
                <button
                  onClick={() => window.open('https://crm.digitalseniorbenefits.com/', '_blank')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors flex-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Open CRM</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleTaskAction = async (task, action) => {
    switch (action) {
      case "call":
        // In a real app, this would initiate a call through Twilio
        console.log(`Initiating call for task ${task.id}`);
        alert(`Calling customer for policy ${task.policyNumber}`);
        break;
      case "message":
        // Send SMS through Twilio
        console.log(`Sending message for task ${task.id}`);
        alert(`Sending message for policy ${task.policyNumber}`);
        break;
      case "complete":
        // Mark task as complete
        if (onTaskUpdate) {
          onTaskUpdate(task.id, "completed");
        }
        break;
      default:
        break;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue" }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 text-${color}-500`} />
      </div>
    </div>
  );

  const TeamMemberCard = ({ name, workload }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{name}</p>
            <p className="text-sm text-gray-500">
              {RETENTION_TEAM[name]?.specialties.join(", ")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tasks Assigned</span>
          <span className="font-medium">{workload.assigned}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Capacity</span>
          <span className="font-medium">{workload.capacity}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              workload.utilization > 80
                ? "bg-red-500"
                : workload.utilization > 60
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${Math.min(workload.utilization, 100)}%` }}
          />
        </div>
        <div className="text-center text-sm text-gray-600">
          {workload.utilization.toFixed(1)}% utilized
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${isMobile ? "p-4" : "p-6"} bg-gray-50 min-h-screen`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Retention Task Dashboard
            </h1>
            <p className="text-gray-600">
              Manage and track retention team tasks
            </p>
          </div>

          {/* View Toggle */}
          <div className="bg-white rounded-lg border border-gray-200 p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setViewMode("tasks")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "tasks"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                📋 Tasks
              </button>
              <button
                onClick={() => setViewMode("distribution")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "distribution"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Settings className="inline h-4 w-4 mr-1" />
                Distribution
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === "tasks" ? (
        <>
          {/* Stats Overview */}
          <div
            className={`grid grid-cols-2 ${
              isMobile ? "gap-3 mb-6" : "md:grid-cols-4 gap-4 mb-8"
            }`}
          >
            <StatCard
              title="Total Tasks"
              value={taskStats.total}
              icon={Activity}
              color="blue"
            />
            <StatCard
              title="High Priority"
              value={taskStats.high}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="Due Today"
              value={taskStats.dueToday}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="Overdue"
              value={taskStats.overdue}
              icon={Calendar}
              color="red"
            />
          </div>

          {/* Team Workload */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Team Workload
            </h2>
            <div
              className={`grid grid-cols-1 ${
                isMobile ? "gap-3" : "md:grid-cols-3 gap-4"
              }`}
            >
              {Object.entries(teamWorkload).map(([name, workload]) => (
                <TeamMemberCard key={name} name={name} workload={workload} />
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div
              className={`flex ${
                isMobile
                  ? "flex-col space-y-3"
                  : "flex-row items-center justify-between"
              }`}
            >
              <div
                className={`flex ${
                  isMobile ? "flex-col space-y-2" : "items-center space-x-4"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-700">Filters:</span>
                </div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
                <select
                  value={selectedTeamMember}
                  onChange={(e) => setSelectedTeamMember(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Team Members</option>
                  {Object.keys(RETENTION_TEAM).map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={`${
                  isMobile ? "text-center" : "text-right"
                } text-sm text-gray-600`}
              >
                Showing {filteredTasks.length} of {tasks.length} tasks
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Active Tasks
            </h2>
            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  No tasks match your current filters
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Distribution Controls View */
        <TaskDistributionControls tasks={tasks} onTaskUpdate={onTaskUpdate} />
      )}
    </div>
  );
};

export default TaskDashboard;
