import React, { useState, useEffect } from 'react';
import ClientManagement from './ClientManagement';
import ClientDashboard from './client/ClientDashboard';
import { ArrowLeft } from 'lucide-react';

const ClientDashboardsTab = ({ currentUser }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'dashboard'

  const handleClientSelect = (client) => {
    console.log('Client selected in tab:', client);
    console.log('Client object details:', JSON.stringify(client, null, 2));
    
    if (!client) {
      console.error('No client provided to handleClientSelect');
      return;
    }
    
    setSelectedClient(client);
    setViewMode('dashboard');
  };

  const handleBack = () => {
    console.log('Going back to client list');
    setSelectedClient(null);
    setViewMode('list');
  };

  console.log('ClientDashboardsTab render:', { viewMode, selectedClient: selectedClient?.name });

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <ClientManagement onClientSelect={handleClientSelect} />
      ) : (
        <ClientDashboard client={selectedClient} onBack={handleBack} currentUser={currentUser} />
      )}
    </div>
  );
};

export default ClientDashboardsTab;