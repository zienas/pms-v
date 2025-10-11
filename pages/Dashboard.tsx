import React from 'react';
import type { Ship, Berth, Port } from '../types';
import PortMap from '../components/PortMap';
import DashboardStats from '../components/DashboardStats';
import { usePort } from '../context/PortContext';

interface DashboardProps {
  selectedPort: Port;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedPort }) => {
  const { ships, berths, openShipFormModal, openBerthDetailModal } = usePort();

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Live Port Dashboard</h1>
        <DashboardStats ships={ships} berths={berths} />
      </div>
      <div className="flex-1 min-h-0">
         <PortMap ships={ships} berths={berths} onSelectShip={openShipFormModal} onSelectBerth={openBerthDetailModal} selectedPort={selectedPort} />
      </div>
    </div>
  );
};

export default Dashboard;
