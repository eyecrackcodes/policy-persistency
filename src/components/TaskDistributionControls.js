import React, { useState, useEffect } from "react";
import { taskDistributionService } from "../services/taskDistributionService";
import { supabase } from "../config/supabase";

const TaskDistributionControls = ({ tasks, onTaskUpdate }) => {
  const [currentStrategy, setCurrentStrategy] = useState("hybrid");
  const [distributionReport, setDistributionReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [redistributing, setRedistributing] = useState(false);

  const strategies = taskDistributionService.getAvailableStrategies();

  const strategyDescriptions = {
    round_robin: "Rotate assignments evenly through team members",
    load_balanced: "Assign to team member with lowest current workload",
    specialty_first: "Prioritize team members with matching specialties",
    priority_weighted: "Higher priority tasks go to more experienced members",
    hybrid: "Combines specialty matching with load balancing (recommended)",
  };

  useEffect(() => {
    generateReport();
  }, [tasks]);

  const generateReport = () => {
    if (tasks && tasks.length > 0) {
      const report = taskDistributionService.generateDistributionReport(tasks);
      setDistributionReport(report);
    }
  };

  const handleStrategyChange = (strategy) => {
    taskDistributionService.setDistributionStrategy(strategy);
    setCurrentStrategy(strategy);
    generateReport();
  };

  const executeRedistribution = async () => {
    if (!tasks || tasks.length === 0) return;

    setRedistributing(true);
    try {
      const redistributions = taskDistributionService.redistributeTasks(tasks);

      // Apply redistributions to database
      for (const redistribution of redistributions) {
        await supabase
          .from("retention_tasks")
          .update({ assigned_to: redistribution.to })
          .eq("task_id", redistribution.taskId);
      }

      // Notify parent component to refresh tasks
      if (onTaskUpdate) {
        onTaskUpdate();
      }

      console.log(
        `✅ Redistributed ${redistributions.length} tasks for better balance`
      );
    } catch (error) {
      console.error("Error redistributing tasks:", error);
    } finally {
      setRedistributing(false);
    }
  };

  const getBalanceScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getUtilizationColor = (percent) => {
    if (percent > 150) return "bg-red-500";
    if (percent > 100) return "bg-orange-500";
    if (percent > 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (!distributionReport) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          📊 Task Distribution Controls
        </h3>
        <p className="text-gray-500">No tasks available for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Distribution Strategy Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Distribution Strategy</h3>

        <div className="space-y-3">
          {Object.entries(strategies).map(([key, value]) => (
            <label
              key={key}
              className="flex items-start space-x-3 cursor-pointer"
            >
              <input
                type="radio"
                name="strategy"
                value={value}
                checked={currentStrategy === value}
                onChange={() => handleStrategyChange(value)}
                className="mt-1"
              />
              <div>
                <div className="font-medium capitalize">
                  {value.replace("_", " ")}
                </div>
                <div className="text-sm text-gray-600">
                  {strategyDescriptions[value]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Team Balance Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">⚖️ Team Balance Overview</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Balance Score:</span>
            <span
              className={`font-bold ${getBalanceScoreColor(
                distributionReport.teamSummary.balanceScore
              )}`}
            >
              {distributionReport.teamSummary.balanceScore.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {distributionReport.teamSummary.totalTasks}
            </div>
            <div className="text-sm text-gray-600">Total Active Tasks</div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {distributionReport.teamSummary.averageUtilization.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Average Utilization</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {distributionReport.redistributionSuggestions.length}
            </div>
            <div className="text-sm text-gray-600">Suggested Moves</div>
          </div>
        </div>

        {/* Team Member Details */}
        <div className="space-y-3">
          {Object.values(distributionReport.members).map((member) => (
            <div key={member.name} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-gray-600">
                  {member.assigned}/{member.capacity} (
                  {member.utilizationPercent.toFixed(1)}%)
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${getUtilizationColor(
                    member.utilizationPercent
                  )}`}
                  style={{
                    width: `${Math.min(member.utilizationPercent, 100)}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>Specialties: {member.specialties.join(", ")}</span>
                <span>{member.available} slots available</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redistribution Actions */}
      {distributionReport.redistributionSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            🔄 Redistribution Suggestions
          </h3>

          <div className="space-y-2 mb-4">
            {distributionReport.redistributionSuggestions
              .slice(0, 5)
              .map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <span className="text-sm">
                    Move task from <strong>{suggestion.from}</strong> to{" "}
                    <strong>{suggestion.to}</strong>
                  </span>
                  <span className="text-xs text-gray-500">
                    {suggestion.reason}
                  </span>
                </div>
              ))}
          </div>

          <button
            onClick={executeRedistribution}
            disabled={redistributing}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {redistributing
              ? "🔄 Redistributing..."
              : `Apply ${distributionReport.redistributionSuggestions.length} Redistributions`}
          </button>
        </div>
      )}

      {/* Recommendations */}
      {distributionReport.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">💡 Recommendations</h3>

          <div className="space-y-2">
            {distributionReport.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  rec.priority === "high"
                    ? "border-red-500 bg-red-50"
                    : rec.priority === "medium"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-blue-500 bg-blue-50"
                }`}
              >
                <div className="font-medium text-sm">
                  {rec.type.replace("_", " ").toUpperCase()}
                </div>
                <div className="text-sm text-gray-700">{rec.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDistributionControls;
