import React from 'react';
import PortMap from '../components/PortMap';
import DashboardStats from '../components/DashboardStats';
import { usePort } from '../context/PortContext';

const Dashboard: React.FC = () => {
  const { state } = usePort();
  const { selectedPort, ships, berths } = state;

  if (!selectedPort) {
      return <div className="text-center p-8 text-gray-400">Please select a port to view the dashboard.</div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Live Port Dashboard</h1>
        <DashboardStats ships={ships} berths={berths} />
      </div>
      <div className="flex-1 min-h-0">
         <PortMap ships={ships} berths={berths} selectedPort={selectedPort} />
      </div>
    </div>
  );
};

export default Dashboard;