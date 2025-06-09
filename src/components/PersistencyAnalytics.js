import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Target, AlertCircle } from 'lucide-react';

const PersistencyAnalytics = ({ data, filteredData }) => {
  const persistencyData = useMemo(() => {
    const sourceData = filteredData.length > 0 ? filteredData : data;
    if (sourceData.length === 0) return null;

    // Enhanced cohort tracking with better date validation
    const cohorts = {};
    const currentDate = new Date();
    
    // Helper function to get months between dates
    const getMonthsBetween = (startDate, endDate) => {
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      let months = 0;
      const current = new Date(start);
      
      while (current <= end) {
        months++;
        current.setMonth(current.getMonth() + 1);
      }
      
      return Math.max(1, months);
    };

    // Process each policy with enhanced validation
    sourceData.forEach(policy => {
      // Validate dates
      const issueDate = policy.issue_date ? new Date(policy.issue_date) : null;
      const paidToDate = policy.paid_to_date ? new Date(policy.paid_to_date) : null;
      
      // Skip policies with invalid or missing dates
      if (!issueDate || !paidToDate || isNaN(issueDate.getTime()) || isNaN(paidToDate.getTime())) {
        return;
      }
      
      // Skip future-dated policies or policies with paid_to before issue
      if (issueDate > currentDate || paidToDate < issueDate) {
        return;
      }

      // Create cohort based on issue month
      const cohortKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = {
          month: cohortKey,
          displayMonth: issueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          issueDate: new Date(issueDate.getFullYear(), issueDate.getMonth(), 1),
          totalIssued: 0,
          terminated: 0,
          totalMonthsPersisted: 0,
          totalPossibleMonths: 0,
          nsfTerminated: 0,
          cancellationTerminated: 0,
          totalDurationDays: 0,
          validDurations: 0,
          totalPremium: 0,
          terminatedPremium: 0,
          policies: []
        };
      }

      const cohort = cohorts[cohortKey];
      cohort.totalIssued++;
      cohort.policies.push(policy);
      cohort.totalPremium += (policy.annual_premium || 0);

      // Calculate actual months persisted (issue month to paid_to month)
      const monthsPersisted = getMonthsBetween(issueDate, paidToDate);
      cohort.totalMonthsPersisted += monthsPersisted;

      // Calculate potential months (issue month to current month, capped at reasonable limit)
      const maxPossibleDate = new Date(Math.min(currentDate.getTime(), issueDate.getTime() + (365 * 24 * 60 * 60 * 1000 * 5))); // Max 5 years
      const possibleMonths = getMonthsBetween(issueDate, maxPossibleDate);
      cohort.totalPossibleMonths += possibleMonths;

      // Track termination details
      cohort.terminated++;
      if (policy.source === 'nsf' || policy.termination_type === 'nsf') {
        cohort.nsfTerminated++;
      } else {
        cohort.cancellationTerminated++;
      }

      // Track duration in days (with fallback calculation)
      let durationDays = policy.duration;
      if (!durationDays || durationDays <= 0) {
        durationDays = Math.round((paidToDate - issueDate) / (1000 * 60 * 60 * 24));
      }
      
      if (durationDays > 0) {
        cohort.totalDurationDays += durationDays;
        cohort.validDurations++;
      }

      // Track premium at risk
      cohort.terminatedPremium += (policy.annual_premium || 0);
    });

    // Calculate enhanced metrics for each cohort
    const persistencyMetrics = Object.values(cohorts)
      .filter(cohort => cohort.totalIssued > 0) // Only cohorts with valid policies
      .map(cohort => {
        // Core persistency calculation: actual vs potential months
        const avgMonthsPersisted = cohort.totalMonthsPersisted / cohort.totalIssued;
        const avgPossibleMonths = cohort.totalPossibleMonths / cohort.totalIssued;
        
        // Persistency rate: percentage of potential time that policies persisted
        const persistencyRate = avgPossibleMonths > 0 
          ? Math.min(100, (avgMonthsPersisted / avgPossibleMonths) * 100)
          : 0;

        // Termination metrics
        const terminationRate = 100; // All policies in dataset have terminated
        const nsfRate = (cohort.nsfTerminated / cohort.totalIssued) * 100;
        const cancellationRate = (cohort.cancellationTerminated / cohort.totalIssued) * 100;

        // Duration metrics
        const avgDaysToTermination = cohort.validDurations > 0 
          ? cohort.totalDurationDays / cohort.validDurations 
          : 0;

        // Premium metrics
        const avgPremium = cohort.totalPremium / cohort.totalIssued;
        const premiumAtRisk = cohort.terminatedPremium;

        // Retention score (inverse of how quickly policies terminated)
        const retentionScore = Math.min(100, (avgMonthsPersisted / 12) * 100); // Based on 12-month baseline

        return {
          ...cohort,
          persistencyRate: parseFloat(persistencyRate.toFixed(2)),
          terminationRate: parseFloat(terminationRate.toFixed(2)),
          nsfRate: parseFloat(nsfRate.toFixed(2)),
          cancellationRate: parseFloat(cancellationRate.toFixed(2)),
          avgDaysToTermination: Math.round(avgDaysToTermination),
          avgMonthsPersisted: parseFloat(avgMonthsPersisted.toFixed(1)),
          avgPossibleMonths: parseFloat(avgPossibleMonths.toFixed(1)),
          avgPremium: Math.round(avgPremium),
          premiumAtRisk: Math.round(premiumAtRisk),
          retentionScore: parseFloat(retentionScore.toFixed(1))
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Ensure we have at least 12 months or all available data
    const last12Months = persistencyMetrics.slice(-12);

    // Calculate rolling averages and trends with improved logic
    const persistencyWithTrends = last12Months.map((cohort, index, array) => {
      // 3-month rolling average (including current month)
      const start = Math.max(0, index - 2);
      const rollingPeriod = array.slice(start, index + 1);
      const avg3Month = rollingPeriod.reduce((sum, c) => sum + c.persistencyRate, 0) / rollingPeriod.length;

      // Month-over-month change
      const momChange = index > 0 
        ? cohort.persistencyRate - array[index - 1].persistencyRate 
        : 0;

      // Year-over-year change (if we have 12+ months of data)
      const yoyChange = array.length >= 12 && index >= 11 
        ? cohort.persistencyRate - array[index - 11].persistencyRate 
        : null;

      // Trend classification
      let trend = 'flat';
      if (Math.abs(momChange) >= 0.5) { // Only significant changes
        trend = momChange > 0 ? 'up' : 'down';
      }

      return {
        ...cohort,
        avg3Month: parseFloat(avg3Month.toFixed(2)),
        momChange: parseFloat(momChange.toFixed(2)),
        yoyChange: yoyChange ? parseFloat(yoyChange.toFixed(2)) : null,
        trend,
        volatility: index >= 2 ? calculateVolatility(array.slice(index - 2, index + 1)) : 0
      };
    });

    // Helper function to calculate volatility (standard deviation of persistency rates)
    function calculateVolatility(periods) {
      if (periods.length < 2) return 0;
      
      const rates = periods.map(p => p.persistencyRate);
      const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      const variance = rates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / rates.length;
      
      return parseFloat(Math.sqrt(variance).toFixed(2));
    }

    // Calculate comprehensive overall statistics
    const validMetrics = persistencyWithTrends.filter(m => m.persistencyRate > 0);
    const overallStats = {
      totalPolicies: validMetrics.reduce((sum, c) => sum + c.totalIssued, 0),
      totalTerminated: validMetrics.reduce((sum, c) => sum + c.terminated, 0),
      avgPersistencyRate: validMetrics.length > 0 
        ? validMetrics.reduce((sum, c) => sum + c.persistencyRate, 0) / validMetrics.length 
        : 0,
      totalPremiumAtRisk: validMetrics.reduce((sum, c) => sum + c.premiumAtRisk, 0),
      avgDaysToTermination: validMetrics.length > 0 
        ? validMetrics.reduce((sum, c) => sum + (c.avgDaysToTermination * c.terminated), 0) / 
          validMetrics.reduce((sum, c) => sum + c.terminated, 0)
        : 0,
      bestMonth: validMetrics.length > 0 
        ? validMetrics.reduce((best, current) => 
            current.persistencyRate > best.persistencyRate ? current : best)
        : null,
      worstMonth: validMetrics.length > 0 
        ? validMetrics.reduce((worst, current) => 
            current.persistencyRate < worst.persistencyRate ? current : worst)
        : null,
      recentTrend: persistencyWithTrends.length >= 3 
        ? persistencyWithTrends.slice(-3).reduce((sum, c) => sum + c.momChange, 0) / 3
        : 0,
      avgVolatility: validMetrics.length > 0 
        ? validMetrics.reduce((sum, c) => sum + c.volatility, 0) / validMetrics.length 
        : 0
    };

    return {
      monthlyData: persistencyWithTrends,
      overallStats,
      dataQuality: {
        totalRecords: sourceData.length,
        validRecords: validMetrics.reduce((sum, c) => sum + c.totalIssued, 0),
        monthsCovered: validMetrics.length,
        oldestCohort: validMetrics.length > 0 ? validMetrics[0].displayMonth : null,
        newestCohort: validMetrics.length > 0 ? validMetrics[validMetrics.length - 1].displayMonth : null
      }
    };
  }, [data, filteredData]);

  if (!persistencyData) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Target className="h-6 w-6 mr-2 text-blue-600" />
          Persistency Analytics
        </h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No data available for persistency analysis</p>
        </div>
      </div>
    );
  }

  const { monthlyData, overallStats, dataQuality } = persistencyData;

  return (
    <div className="space-y-6">
      {/* Data Quality Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Data Quality Summary</span>
          </div>
          <div className="text-sm text-blue-700">
            {dataQuality.validRecords.toLocaleString()} valid policies across {dataQuality.monthsCovered} months
            ({dataQuality.oldestCohort} to {dataQuality.newestCohort})
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Persistency Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {overallStats.avgPersistencyRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {monthlyData.length}-Month Average • Volatility: {overallStats.avgVolatility.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Policies</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {overallStats.totalPolicies.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {overallStats.totalTerminated} Terminated • Avg {overallStats.avgDaysToTermination.toFixed(0)} days
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Best Month</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {overallStats.bestMonth?.displayMonth || 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {overallStats.bestMonth?.persistencyRate.toFixed(1)}% Rate
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Premium at Risk</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                ${(overallStats.totalPremiumAtRisk / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Recent Trend: {overallStats.recentTrend > 0 ? '+' : ''}{overallStats.recentTrend.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-xl shadow-lg">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Persistency Chart */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Target className="h-6 w-6 mr-2 text-blue-600" />
          Month-Over-Month Persistency Rate ({monthlyData.length} Months)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayMonth" />
            <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold">{`Month: ${label}`}</p>
                      <p className="text-green-600">{`Persistency Rate: ${data.persistencyRate}%`}</p>
                      <p className="text-blue-600">{`3-Month Avg: ${data.avg3Month}%`}</p>
                      <p className="text-purple-600">{`MoM Change: ${data.momChange > 0 ? '+' : ''}${data.momChange}%`}</p>
                      <p className="text-gray-600">{`Avg Months Persisted: ${data.avgMonthsPersisted}`}</p>
                      <p className="text-gray-600">{`Policies Issued: ${data.totalIssued}`}</p>
                      <p className="text-red-600">{`NSF Rate: ${data.nsfRate}%`}</p>
                      <p className="text-orange-600">{`Cancel Rate: ${data.cancellationRate}%`}</p>
                      <p className="text-gray-500">{`Volatility: ${data.volatility}%`}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="persistencyRate"
              fill="#10b981"
              fillOpacity={0.1}
              stroke="#10b981"
              strokeWidth={3}
              name="Persistency Rate"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avg3Month"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="3-Month Avg"
            />
            <Bar
              yAxisId="right"
              dataKey="totalIssued"
              fill="#8b5cf6"
              fillOpacity={0.6}
              name="Policies Issued"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Termination Breakdown Chart */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Termination Breakdown by Month
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayMonth" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="nsfRate" fill="#ef4444" name="NSF Rate %" />
            <Bar dataKey="cancellationRate" fill="#f59e0b" name="Cancellation Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Enhanced Monthly Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Detailed Monthly Persistency Data
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3">Month</th>
                <th className="text-right p-3">Policies</th>
                <th className="text-right p-3">Persistency</th>
                <th className="text-right p-3">MoM</th>
                <th className="text-right p-3">3M Avg</th>
                <th className="text-right p-3">Avg Months</th>
                <th className="text-right p-3">NSF%</th>
                <th className="text-right p-3">Cancel%</th>
                <th className="text-right p-3">Avg Premium</th>
                <th className="text-right p-3">Risk</th>
                <th className="text-right p-3">Vol</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((month, index) => (
                <tr key={month.month} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium">{month.displayMonth}</td>
                  <td className="text-right p-3">{month.totalIssued.toLocaleString()}</td>
                  <td className="text-right p-3">
                    <span className={`font-semibold ${
                      month.persistencyRate >= 25 ? 'text-green-600' :
                      month.persistencyRate >= 15 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {month.persistencyRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right p-3">
                    <div className="flex items-center justify-end">
                      {month.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600 mr-1" />}
                      {month.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600 mr-1" />}
                      <span className={
                        month.momChange > 0 ? 'text-green-600' : 
                        month.momChange < 0 ? 'text-red-600' : 'text-gray-600'
                      }>
                        {month.momChange > 0 ? '+' : ''}{month.momChange.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="text-right p-3 text-blue-600">{month.avg3Month.toFixed(1)}%</td>
                  <td className="text-right p-3 text-blue-600">{month.avgMonthsPersisted} mo</td>
                  <td className="text-right p-3 text-red-600">{month.nsfRate.toFixed(1)}%</td>
                  <td className="text-right p-3 text-orange-600">{month.cancellationRate.toFixed(1)}%</td>
                  <td className="text-right p-3">${month.avgPremium.toLocaleString()}</td>
                  <td className="text-right p-3 text-red-600">${(month.premiumAtRisk / 1000).toFixed(0)}K</td>
                  <td className="text-right p-3 text-gray-500">{month.volatility.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>• <strong>Persistency:</strong> Percentage of potential lifetime that policies persisted</p>
          <p>• <strong>MoM:</strong> Month-over-month change in persistency rate</p>
          <p>• <strong>3M Avg:</strong> 3-month rolling average persistency rate</p>
          <p>• <strong>Vol:</strong> Volatility (standard deviation) of recent persistency rates</p>
          <p>• Data quality: {dataQuality.validRecords} of {dataQuality.totalRecords} records valid for analysis</p>
        </div>
      </div>
    </div>
  );
};

export default PersistencyAnalytics; 