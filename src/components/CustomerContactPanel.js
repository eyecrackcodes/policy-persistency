import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, ExternalLink, User, Search, ChevronUp, ChevronDown, X } from 'lucide-react';

const CustomerContactPanel = ({ task, policy }) => {
  const [agentLookup, setAgentLookup] = useState('');
  const [lookupResults, setLookupResults] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Mock agent contact database - in production, this would come from your CRM/database
  const agentContactDatabase = {
    // Sample entries - you can populate this with real agent data
    'john smith': { phone: '555-0123', email: 'john.smith@agency.com', agency: 'ABC Insurance' },
    'sarah johnson': { phone: '555-0124', email: 'sarah.j@agency.com', agency: 'XYZ Agency' },
    'mike wilson': { phone: '555-0125', email: 'mike.w@agency.com', agency: 'Wilson Insurance' },
  };

  const searchAgentContact = () => {
    const searchTerm = agentLookup.toLowerCase().trim();
    const result = agentContactDatabase[searchTerm];
    
    if (result) {
      setLookupResults({
        found: true,
        ...result
      });
    } else {
      setLookupResults({
        found: false,
        searched: searchTerm
      });
    }
  };

  // Integration functions for different communication tools
  const openDialpad = (phoneNumber) => {
    // Dialpad web integration
    if (phoneNumber) {
      // Option 1: Direct Dialpad web app (if configured)
      window.open(`https://dialpad.com/app/calls?number=${encodeURIComponent(phoneNumber)}`, '_blank');
      
      // Option 2: Custom phone handler (if configured on system)
      // window.location.href = `tel:${phoneNumber}`;
    }
  };

  const openSkype = (phoneNumber) => {
    if (phoneNumber) {
      window.location.href = `skype:${phoneNumber}?call`;
    }
  };

  const openTeams = (phoneNumber) => {
    if (phoneNumber) {
      window.open(`https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(phoneNumber)}`, '_blank');
    }
  };

  const openGmail = (email, subject = '') => {
    if (email) {
      const defaultSubject = subject || `Policy ${policy?.policy_nbr || task?.policyNumber} - Follow Up Required`;
      window.open(`https://mail.google.com/mail/?view=cm&to=${email}&su=${encodeURIComponent(defaultSubject)}`, '_blank');
    }
  };

  const openOutlook = (email, subject = '') => {
    if (email) {
      const defaultSubject = subject || `Policy ${policy?.policy_nbr || task?.policyNumber} - Follow Up Required`;
      window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${email}&subject=${encodeURIComponent(defaultSubject)}`, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const customerName = policy?.agent_name || task?.customerName || 'Unknown Customer';
  const policyNumber = policy?.policy_nbr || task?.policyNumber;
  const premium = policy?.annual_premium || task?.premium;

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm">
      {/* Compact Header - Always Visible */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-t-lg border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-900 text-sm">Quick Contact</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            {task?.priority?.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-blue-100 rounded text-gray-600"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-red-100 rounded text-gray-600"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compact Policy Info */}
      <div className="p-3 bg-gray-50 text-xs text-gray-600">
        <div className="truncate"><strong>Policy:</strong> {policyNumber}</div>
        <div className="truncate"><strong>Customer:</strong> {customerName}</div>
        <div><strong>Premium:</strong> ${premium?.toLocaleString()}</div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4"
             style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Quick Actions First */}
          <div>
            <h5 className="font-medium text-gray-700 mb-2 text-sm">Quick Actions</h5>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => window.open('https://crm.digitalseniorbenefits.com/', '_blank')}
                className="flex items-center justify-center px-2 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                DSB CRM
              </button>
              <button
                onClick={() => window.open(`https://ams.digitalbga.com/search?q=${encodeURIComponent(policyNumber)}`, '_blank')}
                className="flex items-center justify-center px-2 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 text-xs"
                title={`Search for policy ${policyNumber} in AMS`}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                AMS Policy
              </button>
            </div>
            <button
              onClick={() => copyToClipboard(policyNumber)}
              className="w-full px-2 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs flex items-center justify-center"
              title="Copy policy number to clipboard"
            >
              📋 Copy Policy: {policyNumber}
            </button>
          </div>

          {/* Agent Contact Lookup */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Contact Lookup
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={agentLookup}
                onChange={(e) => setAgentLookup(e.target.value)}
                placeholder="Enter agent name..."
                className="flex-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
              <button
                onClick={searchAgentContact}
                className="px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-xs"
              >
                <Search className="h-3 w-3" />
              </button>
            </div>

            {lookupResults && (
              <div className="mt-2 p-2 rounded-md border text-xs">
                {lookupResults.found ? (
                  <div className="bg-green-50 border-green-200 p-2 rounded">
                    <div className="font-medium text-green-800 mb-1">✅ Contact Found</div>
                    <div className="space-y-1">
                      <div><strong>Phone:</strong> {lookupResults.phone}</div>
                      <div><strong>Email:</strong> {lookupResults.email}</div>
                      <div><strong>Agency:</strong> {lookupResults.agency}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border-yellow-200 p-2 rounded">
                    <div className="text-yellow-800">
                      ⚠️ No contact found for "{lookupResults.searched}"
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Communication Tools */}
          {lookupResults?.found && (
            <div>
              <h5 className="font-medium text-gray-700 mb-2 text-sm">Communication</h5>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openDialpad(lookupResults?.phone)}
                  className="flex items-center justify-center px-2 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </button>
                <button
                  onClick={() => openGmail(lookupResults?.email)}
                  className="flex items-center justify-center px-2 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-xs"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </button>
              </div>
            </div>
          )}

          {/* Status Actions */}
          <div>
            <h5 className="font-medium text-gray-700 mb-2 text-sm">Mark Status</h5>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-2 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-xs">
                Contacted
              </button>
              <button className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 text-xs">
                Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerContactPanel; 