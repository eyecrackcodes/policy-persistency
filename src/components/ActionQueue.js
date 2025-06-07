import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Mail,
  Send,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  Target,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// Utility functions moved outside component for broader access
const getPriorityColor = (priority) => {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
    case "medium":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "low":
      return "text-green-600 bg-green-50 border-green-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "in_progress":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "completed":
      return "text-green-600 bg-green-50 border-green-200";
    case "cancelled":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const ActionQueue = ({
  actions = [],
  onActionUpdate,
  onExecuteAction,
  emailService,
  n8nService,
}) => {
  const [filteredActions, setFilteredActions] = useState(actions);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    type: "all",
    search: "",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [selectedAction, setSelectedAction] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedActions, setExpandedActions] = useState(new Set());

  useEffect(() => {
    setFilteredActions(actions);
  }, [actions]);

  useEffect(() => {
    filterAndSortActions();
  }, [actions, filters, sortConfig]);

  const filterAndSortActions = () => {
    let filtered = [...actions];

    // Apply filters
    if (filters.status !== "all") {
      filtered = filtered.filter((action) => action.status === filters.status);
    }

    if (filters.priority !== "all") {
      filtered = filtered.filter(
        (action) => action.priority === filters.priority
      );
    }

    if (filters.type !== "all") {
      filtered = filtered.filter((action) => action.type === filters.type);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (action) =>
          action.title.toLowerCase().includes(searchLower) ||
          action.description.toLowerCase().includes(searchLower) ||
          (action.agentName &&
            action.agentName.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle special cases
      if (sortConfig.key === "createdAt" || sortConfig.key === "dueDate") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortConfig.key === "priority") {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[aValue] || 0;
        bValue = priorityOrder[bValue] || 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    setFilteredActions(filtered);
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
  };

  const handleStatusUpdate = async (actionId, newStatus, notes = "") => {
    try {
      const action = actions.find((a) => a.id === actionId);
      if (!action) return;

      const updatedAction = {
        ...action,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        notes: notes || action.notes,
      };

      if (onActionUpdate) {
        await onActionUpdate(updatedAction);
      }
    } catch (error) {
      console.error("Error updating action status:", error);
    }
  };

  const handleExecuteAction = async (action) => {
    try {
      if (onExecuteAction) {
        await onExecuteAction(action);
      }

      // Auto-update status to in_progress
      await handleStatusUpdate(action.id, "in_progress");
    } catch (error) {
      console.error("Error executing action:", error);
    }
  };

  const toggleActionExpansion = (actionId) => {
    setExpandedActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const getActionIcon = (type) => {
    switch (type) {
      case "agent_training":
        return <Users className="h-4 w-4" />;
      case "high_value_recovery":
        return <DollarSign className="h-4 w-4" />;
      case "product_analysis":
        return <TrendingUp className="h-4 w-4" />;
      case "seasonal_alert":
        return <Calendar className="h-4 w-4" />;
      case "batch_recovery":
        return <Target className="h-4 w-4" />;
      case "underwriting_review":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil(
      (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getActionTypes = () => {
    const types = [...new Set(actions.map((action) => action.type))];
    return types;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Action Queue</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
            <div className="text-sm text-gray-500">
              {filteredActions.length} of {actions.length} actions
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange("priority", e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {getActionTypes().map((type) => (
                  <option key={type} value={type}>
                    {type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search actions..."
                  className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  onClick={() => handleSort("priority")}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Priority</span>
                  {sortConfig.key === "priority" &&
                    (sortConfig.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  onClick={() => handleSort("title")}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Action</span>
                  {sortConfig.key === "title" &&
                    (sortConfig.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Status</span>
                  {sortConfig.key === "status" &&
                    (sortConfig.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <button
                  onClick={() => handleSort("dueDate")}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Due Date</span>
                  {sortConfig.key === "dueDate" &&
                    (sortConfig.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Impact
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredActions.map((action) => (
              <React.Fragment key={action.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                        action.priority
                      )}`}
                    >
                      {action.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-gray-100 rounded-full">
                        {getActionIcon(action.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {action.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        action.status
                      )}`}
                    >
                      {action.status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span>{formatDate(action.dueDate)}</span>
                      <span
                        className={`text-xs ${
                          getDaysUntilDue(action.dueDate) < 0
                            ? "text-red-600"
                            : getDaysUntilDue(action.dueDate) <= 3
                            ? "text-yellow-600"
                            : "text-gray-500"
                        }`}
                      >
                        {getDaysUntilDue(action.dueDate) < 0
                          ? `${Math.abs(
                              getDaysUntilDue(action.dueDate)
                            )} days overdue`
                          : `${getDaysUntilDue(action.dueDate)} days left`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {action.estimatedImpact?.potentialRecovery && (
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatCurrency(
                            action.estimatedImpact.potentialRecovery
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          potential recovery
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => toggleActionExpansion(action.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {expandedActions.has(action.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleActionClick(action)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {action.status === "pending" && (
                      <button
                        onClick={() => handleExecuteAction(action)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {action.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusUpdate(action.id, "pending")}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {(action.status === "pending" ||
                      action.status === "in_progress") && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(action.id, "completed")
                        }
                        className="text-green-600 hover:text-green-900"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Action Details */}
                {expandedActions.has(action.id) && (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        {/* Recommended Actions */}
                        {action.recommendedActions &&
                          action.recommendedActions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Recommended Actions:
                              </h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {action.recommendedActions.map((rec, index) => (
                                  <li key={index}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Action-specific details */}
                        {action.type === "agent_training" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                Agent:
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {action.agentName}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                NSF Count:
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {action.nsfCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                Total Premium:
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {formatCurrency(action.totalPremium)}
                              </span>
                            </div>
                          </div>
                        )}

                        {action.type === "high_value_recovery" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                State:
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {action.state}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                Policy Count:
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {action.policyCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">
                                Total Premium:
                              </span>
                              <span className="ml-2 text-sm text-gray-900">
                                {formatCurrency(action.totalPremium)}
                              </span>
                            </div>
                          </div>
                        )}

                        {action.type === "product_analysis" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  Product:
                                </span>
                                <span className="ml-2 text-sm text-gray-900">
                                  {action.product}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  NSF Rate:
                                </span>
                                <span className="ml-2 text-sm text-gray-900">
                                  {(action.nsfRate * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {action.insights && action.insights.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-1">
                                  Insights:
                                </h5>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {action.insights.map((insight, index) => (
                                    <li key={index}>{insight}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Policies involved */}
                        {action.policies && action.policies.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              Affected Policies ({action.policies.length}):
                            </h4>
                            <div className="text-sm text-gray-700">
                              {action.policies
                                .slice(0, 10)
                                .map((policy, index) => (
                                  <span
                                    key={index}
                                    className="inline-block bg-gray-200 rounded px-2 py-1 mr-2 mb-1"
                                  >
                                    {typeof policy === "string"
                                      ? policy
                                      : policy.policyNumber || policy}
                                  </span>
                                ))}
                              {action.policies.length > 10 && (
                                <span className="text-gray-500">
                                  +{action.policies.length - 10} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredActions.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No actions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {actions.length === 0
              ? "Upload policy data to generate actions"
              : "Try adjusting your filters"}
          </p>
        </div>
      )}

      {/* Action Detail Modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onStatusUpdate={handleStatusUpdate}
          emailService={emailService}
          n8nService={n8nService}
        />
      )}
    </div>
  );
};

// Action Detail Modal Component
const ActionDetailModal = ({
  action,
  onClose,
  onStatusUpdate,
  emailService,
  n8nService,
}) => {
  const [notes, setNotes] = useState(action.notes || "");
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecuteEmail = async () => {
    setIsExecuting(true);
    try {
      if (emailService && action.type === "agent_training") {
        await emailService.sendAgentTrainingEmail({
          agentName: action.agentName,
          nsfCount: action.nsfCount,
          policies: action.policies,
        });
      }
      // Handle other email types...
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteN8N = async () => {
    setIsExecuting(true);
    try {
      if (n8nService) {
        await n8nService.triggerWorkflow(action.type, {
          actionId: action.id,
          ...action,
        });
      }
    } catch (error) {
      console.error("Error triggering N8N workflow:", error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-gray-900">{action.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                  action.priority
                )}`}
              >
                {action.priority.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                  action.status
                )}`}
              >
                {action.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <p className="text-sm text-gray-900">{action.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add notes about this action..."
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-2">
              {emailService && (
                <button
                  onClick={handleExecuteEmail}
                  disabled={isExecuting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </button>
              )}
              {n8nService && (
                <button
                  onClick={handleExecuteN8N}
                  disabled={isExecuting}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Trigger N8N
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onStatusUpdate(action.id, "completed", notes)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </button>
              <button
                onClick={onClose}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionQueue;
