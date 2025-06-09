import React, { useState, useMemo } from 'react';
import { X, TrendingUp, AlertTriangle, DollarSign, Users, Calendar, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// US State populations (2023 estimates) for per capita calculations
const STATE_POPULATIONS = {
  'TX': 30029572, 'FL': 22610726, 'CA': 38940231, 'NY': 19336776, 'PA': 12972008,
  'IL': 12587530, 'OH': 11785935, 'GA': 10912876, 'NC': 10698973, 'MI': 10037261,
  'NJ': 9267130, 'VA': 8683619, 'WA': 7785786, 'AZ': 7359197, 'MA': 7001399,
  'TN': 6910840, 'IN': 6805663, 'MD': 6164660, 'MO': 6196156, 'WI': 5892539,
  'CO': 5839926, 'MN': 5735394, 'SC': 5282634, 'AL': 5108468, 'LA': 4590241,
  'KY': 4526154, 'OR': 4233358, 'OK': 4019800, 'CT': 3626205, 'UT': 3417734,
  'IA': 3207004, 'NV': 3194176, 'AR': 3067732, 'MS': 2940057, 'KS': 2940865,
  'NM': 2114371, 'NE': 1967923, 'ID': 1944162, 'WV': 1770071, 'HI': 1435138,
  'NH': 1395231, 'ME': 1395722, 'MT': 1104271, 'RI': 1095610, 'DE': 1018396,
  'SD': 919318, 'ND': 783926, 'AK': 732673, 'VT': 647464, 'WY': 584057
};

const InsightModal = ({ insight, onClose, data, analytics }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'count', direction: 'desc' });

  if (!insight) return null;

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#f97316'];

  // Enhanced sorting function
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'desc' 
      ? <ChevronDown className="h-4 w-4 text-blue-600" />
      : <ChevronUp className="h-4 w-4 text-blue-600" />;
  };

  // Comprehensive state analytics
  const renderComprehensiveStateAnalysis = () => {
    // Calculate metrics for ALL states
    const stateMetrics = {};
    
    data.forEach(policy => {
      const state = policy.issue_state || 'Unknown';
      if (!stateMetrics[state]) {
        stateMetrics[state] = {
          state,
          count: 0,
          nsf: 0,
          cancellation: 0,
          totalPremium: 0,
          highValuePolicies: 0,
          population: STATE_POPULATIONS[state] || 0
        };
      }
      
      const metrics = stateMetrics[state];
      metrics.count++;
      metrics.totalPremium += (policy.annual_premium || 0);
      
      if ((policy.annual_premium || 0) > 3000) {
        metrics.highValuePolicies++;
      }
      
      if (policy.source === 'nsf' || policy.termination_type === 'nsf') {
        metrics.nsf++;
      } else {
        metrics.cancellation++;
      }
    });

    // Calculate derived metrics
    const stateData = Object.values(stateMetrics)
      .filter(state => state.state !== 'Unknown' && state.count > 0)
      .map(state => ({
        ...state,
        avgPremium: state.count > 0 ? state.totalPremium / state.count : 0,
        terminationRate: state.count > 0 ? ((state.nsf + state.cancellation) / state.count * 100) : 0,
        nsfRate: state.count > 0 ? (state.nsf / state.count * 100) : 0,
        cancellationRate: state.count > 0 ? (state.cancellation / state.count * 100) : 0,
        policiesPerCapita: state.population > 0 ? (state.count / state.population * 100000) : 0,
        premiumPerCapita: state.population > 0 ? (state.totalPremium / state.population) : 0,
        highValueRate: state.count > 0 ? (state.highValuePolicies / state.count * 100) : 0
      }));

    // Sort data
    const sortedData = [...stateData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (sortConfig.direction === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });

    // Top performing states for charts
    const topStates = sortedData.slice(0, 10);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stateData.length}</div>
            <div className="text-sm text-gray-600">States with Data</div>
          </div>
                     <div className="bg-green-50 p-4 rounded-lg">
             <div className="text-2xl font-bold text-green-600">
               ${Math.round(stateData.reduce((sum, s) => sum + s.avgPremium, 0) / stateData.length).toLocaleString()}
             </div>
             <div className="text-sm text-gray-600">Avg Premium</div>
           </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {(stateData.reduce((sum, s) => sum + s.terminationRate, 0) / stateData.length).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Termination</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stateData.reduce((sum, s) => sum + s.count, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Policies</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold mb-4">Top States by Volume</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total Policies" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold mb-4">Policies Per 100K Population</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[...stateData].sort((a, b) => b.policiesPerCapita - a.policiesPerCapita).slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" />
                <YAxis />
                <Tooltip formatter={(value) => [value.toFixed(1), 'Per 100K']} />
                <Bar dataKey="policiesPerCapita" fill="#10b981" name="Per 100K Pop" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comprehensive sortable table */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Complete State Analysis</h4>
            <div className="text-sm text-gray-600">
              Showing {sortedData.length} states • Click headers to sort
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">
                    <button 
                      onClick={() => handleSort('state')}
                      className="flex items-center space-x-1 hover:text-blue-600"
                    >
                      <span>State</span>
                      {getSortIcon('state')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('count')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Policies</span>
                      {getSortIcon('count')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('policiesPerCapita')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Per 100K</span>
                      {getSortIcon('policiesPerCapita')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('avgPremium')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Avg Premium</span>
                      {getSortIcon('avgPremium')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('terminationRate')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Term Rate</span>
                      {getSortIcon('terminationRate')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('nsfRate')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>NSF Rate</span>
                      {getSortIcon('nsfRate')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('highValueRate')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>High Value %</span>
                      {getSortIcon('highValueRate')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">NSF/Cancel</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((state, idx) => (
                  <tr key={state.state} className={`border-b hover:bg-gray-50 ${idx < 5 ? 'bg-blue-50' : ''}`}>
                    <td className="p-3 font-medium">{state.state}</td>
                    <td className="p-3 text-right">{state.count.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      {state.policiesPerCapita > 0 ? state.policiesPerCapita.toFixed(1) : 'N/A'}
                    </td>
                                         <td className="p-3 text-right">${Math.round(state.avgPremium).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className={`${
                        state.terminationRate > 80 ? 'text-red-600 font-semibold' : 
                        state.terminationRate > 60 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {state.terminationRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`${
                        state.nsfRate > 50 ? 'text-red-600 font-semibold' : 
                        state.nsfRate > 30 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {state.nsfRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">{state.highValueRate.toFixed(1)}%</td>
                    <td className="p-3 text-right text-sm">
                      <span className="text-red-600">{state.nsf}</span>
                      /
                      <span className="text-orange-600">{state.cancellation}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>• <strong>Per 100K:</strong> Policies per 100,000 population (market penetration)</p>
            <p>• <strong>Term Rate:</strong> Percentage of policies that terminated (NSF + Cancellation)</p>
            <p>• <strong>High Value:</strong> Policies with premium &gt; $3,000</p>
            <p>• Top 5 states highlighted in blue</p>
          </div>
        </div>
      </div>
    );
  };

  // Comprehensive agent analytics
  const renderComprehensiveAgentAnalysis = () => {
    // Calculate metrics for ALL agents
    const agentMetrics = {};
    
    data.forEach(policy => {
      const agent = policy.agent_name || policy.WA_Name || 'Unknown';
      if (!agentMetrics[agent]) {
        agentMetrics[agent] = {
          agent,
          count: 0,
          nsf: 0,
          cancellation: 0,
          totalPremium: 0,
          highValuePolicies: 0,
          avgDuration: 0,
          totalDuration: 0,
          validDurations: 0
        };
      }
      
      const metrics = agentMetrics[agent];
      metrics.count++;
      metrics.totalPremium += (policy.annual_premium || 0);
      
      // Track duration for average calculation
      if (policy.duration && !isNaN(policy.duration)) {
        metrics.totalDuration += policy.duration;
        metrics.validDurations++;
      }
      
      if ((policy.annual_premium || 0) > 3000) {
        metrics.highValuePolicies++;
      }
      
      if (policy.source === 'nsf' || policy.termination_type === 'nsf') {
        metrics.nsf++;
      } else {
        metrics.cancellation++;
      }
    });

    // Calculate derived metrics
    const agentData = Object.values(agentMetrics)
      .filter(agent => agent.agent !== 'Unknown' && agent.count > 0)
      .map(agent => ({
        ...agent,
        avgPremium: agent.count > 0 ? agent.totalPremium / agent.count : 0,
        avgDuration: agent.validDurations > 0 ? agent.totalDuration / agent.validDurations : 0,
        terminationRate: agent.count > 0 ? ((agent.nsf + agent.cancellation) / agent.count * 100) : 0,
        nsfRate: agent.count > 0 ? (agent.nsf / agent.count * 100) : 0,
        cancellationRate: agent.count > 0 ? (agent.cancellation / agent.count * 100) : 0,
        highValueRate: agent.count > 0 ? (agent.highValuePolicies / agent.count * 100) : 0,
        riskScore: agent.count > 0 ? Math.round((agent.nsf + agent.cancellation) / agent.count * 100) : 0,
        retentionScore: agent.count > 0 ? Math.round((1 - ((agent.nsf + agent.cancellation) / agent.count)) * 100) : 0
      }));

    // Sort data
    const sortedData = [...agentData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (sortConfig.direction === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });

    // Top performing agents for charts
    const topAgents = [...agentData].sort((a, b) => b.count - a.count).slice(0, 10);
    const highRiskAgents = [...agentData].sort((a, b) => b.terminationRate - a.terminationRate).slice(0, 10);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{agentData.length}</div>
            <div className="text-sm text-gray-600">Active Agents</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ${Math.round(agentData.reduce((sum, a) => sum + a.avgPremium, 0) / agentData.length).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Avg Premium</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {(agentData.reduce((sum, a) => sum + a.terminationRate, 0) / agentData.length).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Termination</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {agentData.reduce((sum, a) => sum + a.count, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Policies</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold mb-4">Top Agents by Volume</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topAgents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total Policies" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold mb-4">Highest Risk Agents</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={highRiskAgents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => [value.toFixed(1) + '%', 'Termination Rate']} />
                <Bar dataKey="terminationRate" fill="#ef4444" name="Termination %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comprehensive sortable table */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Complete Agent Analysis</h4>
            <div className="text-sm text-gray-600">
              Showing {sortedData.length} agents • Click headers to sort
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">
                    <button 
                      onClick={() => handleSort('agent')}
                      className="flex items-center space-x-1 hover:text-blue-600"
                    >
                      <span>Agent</span>
                      {getSortIcon('agent')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('count')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Policies</span>
                      {getSortIcon('count')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('avgPremium')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Avg Premium</span>
                      {getSortIcon('avgPremium')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('terminationRate')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Term Rate</span>
                      {getSortIcon('terminationRate')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('nsfRate')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>NSF Rate</span>
                      {getSortIcon('nsfRate')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('avgDuration')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Avg Days</span>
                      {getSortIcon('avgDuration')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('highValueRate')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>High Value %</span>
                      {getSortIcon('highValueRate')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">
                    <button 
                      onClick={() => handleSort('retentionScore')}
                      className="flex items-center space-x-1 hover:text-blue-600 ml-auto"
                    >
                      <span>Retention</span>
                      {getSortIcon('retentionScore')}
                    </button>
                  </th>
                  <th className="text-right p-3 font-medium">NSF/Cancel</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((agent, idx) => (
                  <tr key={agent.agent} className={`border-b hover:bg-gray-50 ${
                    agent.terminationRate > 80 ? 'bg-red-50' : 
                    agent.terminationRate > 60 ? 'bg-orange-50' : 
                    idx < 5 ? 'bg-blue-50' : ''
                  }`}>
                    <td className="p-3 font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{agent.agent}</span>
                        {agent.terminationRate > 80 && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                            HIGH RISK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">{agent.count.toLocaleString()}</td>
                    <td className="p-3 text-right">${Math.round(agent.avgPremium).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className={`${
                        agent.terminationRate > 80 ? 'text-red-600 font-semibold' : 
                        agent.terminationRate > 60 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {agent.terminationRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`${
                        agent.nsfRate > 50 ? 'text-red-600 font-semibold' : 
                        agent.nsfRate > 30 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {agent.nsfRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right">{agent.avgDuration.toFixed(0)} days</td>
                    <td className="p-3 text-right">{agent.highValueRate.toFixed(1)}%</td>
                    <td className="p-3 text-right">
                      <span className={`${
                        agent.retentionScore > 80 ? 'text-green-600 font-semibold' : 
                        agent.retentionScore > 60 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {agent.retentionScore}%
                      </span>
                    </td>
                    <td className="p-3 text-right text-sm">
                      <span className="text-red-600">{agent.nsf}</span>
                      /
                      <span className="text-orange-600">{agent.cancellation}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>• <strong>Term Rate:</strong> Percentage of policies that terminated (NSF + Cancellation)</p>
            <p>• <strong>Avg Days:</strong> Average policy duration before termination</p>
            <p>• <strong>High Value:</strong> Policies with premium &gt; $3,000</p>
            <p>• <strong>Retention:</strong> Percentage of policies successfully retained</p>
            <p>• High risk agents (80%+ termination) highlighted in red, top performers in blue</p>
          </div>
        </div>
      </div>
    );
  };

  const renderTopProductDetails = () => {
    const product = insight.product;
    const productPolicies = data.filter(p => 
      (p.product || p.Product || 'Unknown') === product
    );

    const stateData = {};
    productPolicies.forEach(policy => {
      const state = policy.issue_state || 'Unknown';
      if (!stateData[state]) {
        stateData[state] = { state, count: 0, nsf: 0, cancellation: 0 };
      }
      stateData[state].count++;
      if (policy.source === 'nsf' || policy.termination_type === 'nsf') {
        stateData[state].nsf++;
      } else {
        stateData[state].cancellation++;
      }
    });

    const stateChartData = Object.values(stateData)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{insight.count}</div>
            <div className="text-sm text-gray-600">Total Policies</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">${Math.round(insight.avgPremium).toLocaleString()}</div>
            <div className="text-sm text-gray-600">Avg Premium</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{insight.terminationRate}%</div>
            <div className="text-sm text-gray-600">Termination Rate</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{insight.nsfCount + insight.cancellationCount}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold mb-4">Geographic Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stateChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="nsf" fill="#ef4444" name="NSF" />
              <Bar dataKey="cancellation" fill="#f59e0b" name="Cancellation" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderTopStateDetails = () => {
    const state = insight.state;
    const statePolicies = data.filter(p => 
      (p.issue_state || 'Unknown') === state
    );

    const productData = {};
    statePolicies.forEach(policy => {
      const product = policy.product || policy.Product || 'Unknown';
      if (!productData[product]) {
        productData[product] = { product, count: 0, nsf: 0, cancellation: 0 };
      }
      productData[product].count++;
      if (policy.source === 'nsf' || policy.termination_type === 'nsf') {
        productData[product].nsf++;
      } else {
        productData[product].cancellation++;
      }
    });

    const productChartData = Object.values(productData)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{insight.count}</div>
            <div className="text-sm text-gray-600">Total Policies</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">${Math.round(insight.avgPremium).toLocaleString()}</div>
            <div className="text-sm text-gray-600">Avg Premium</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{insight.terminationRate}%</div>
            <div className="text-sm text-gray-600">Termination Rate</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{insight.nsfCount}/{insight.cancellationCount}</div>
            <div className="text-sm text-gray-600">NSF/Cancel</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold mb-4">Product Breakdown</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="nsf" fill="#ef4444" name="NSF" />
              <Bar dataKey="cancellation" fill="#f59e0b" name="Cancellation" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const getModalTitle = () => {
    switch (insight.type) {
      case 'highRiskAgent':
        // Show comprehensive analysis for agent insights
        return insight.agent ? `Agent Analysis: ${insight.agent}` : 'Comprehensive Agent Analysis';
      case 'topProduct':
        return `Product Analysis: ${insight.product}`;
      case 'topState':
        // Show comprehensive analysis for state insights
        return insight.state ? `State Analysis: ${insight.state}` : 'Comprehensive State Analysis';
      default:
        return 'Detailed Insights';
    }
  };

  const getModalIcon = () => {
    switch (insight.type) {
      case 'highRiskAgent':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      case 'topProduct':
        return <TrendingUp className="h-6 w-6 text-blue-600" />;
      case 'topState':
        return <DollarSign className="h-6 w-6 text-green-600" />;
      default:
        return <Users className="h-6 w-6 text-gray-600" />;
    }
  };

  const renderContent = () => {
    switch (insight.type) {
      case 'highRiskAgent':
        // Always show comprehensive analysis for agent insights
        return renderComprehensiveAgentAnalysis();
      case 'topProduct':
        return renderTopProductDetails();
      case 'topState':
        // Always show comprehensive analysis for state insights
        return renderComprehensiveStateAnalysis();
      default:
        return <div>No detailed data available</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getModalIcon()}
            <h2 className="text-2xl font-bold text-gray-900">{getModalTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InsightModal;