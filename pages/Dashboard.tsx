import React, { useMemo } from 'react';
import PortMap from '../components/PortMap';
import DashboardStats from '../components/DashboardStats';
import { usePort } from '../context/PortContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { state } = usePort();
  const { currentUser } = useAuth();
  const { selectedPort, ships, berths, isLoading } = state;

  const displayedShips = useMemo(() => {
    if (currentUser?.role === UserRole.PILOT) {
      return ships.filter(ship => ship.pilotId === currentUser.id);
    }
    if (currentUser?.role === UserRole.AGENT) {
        return ships.filter(ship => ship.agentId === currentUser.id);
    }
    return ships;
  }, [ships, currentUser]);

  if (!selectedPort) {
      return <div className="text-center p-8 text-gray-400">Please select a port to view the dashboard.</div>;
  }

  return (
    <div className="h-full flex flex-col gap-4" data-log-context="Dashboard">
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Live Port Dashboard</h1>
        <DashboardStats ships={displayedShips} berths={berths} />
      </div>
      <div className="flex-1 min-h-0">
         <PortMap ships={displayedShips} berths={berths} selectedPort={selectedPort} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Dashboard;
