

import React from 'react';
import type { Ship, Berth } from '../types';
import { ShipStatus } from '../types';
import AnchorIcon from './icons/AnchorIcon';
import ShipIcon from './icons/ShipIcon';
import ChartBarIcon from './icons/ChartBarIcon';

interface DashboardStatsProps {
  ships: Ship[];
  berths: Berth[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ ships, berths }) => {
  const activeShips = ships.filter(s => s.status !== ShipStatus.LEFT_PORT);
  const occupiedBerthIds = new Set(activeShips.flatMap(s => s.berthIds));
  
  const berthOccupancy = berths.length > 0 ? (occupiedBerthIds.size / berths.length) * 100 : 0;

  const statusCounts = activeShips.reduce((acc, ship) => {
    acc[ship.status] = (acc[ship.status] || 0) + 1;
    return acc;
  }, {} as { [key in ShipStatus]?: number });

  const StatCard: React.FC<{ icon: React.ElementType; title: string; value?: string | number; children?: React.ReactNode }> = ({ icon: Icon, title, value, children }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg flex-1">
      <div className="flex items-center">
        <div className="p-3 bg-cyan-500/10 rounded-full mr-4">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          {value !== undefined && <p className="text-2xl font-bold text-white">{value}</p>}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard icon={AnchorIcon} title="Berth Occupancy" value={`${berthOccupancy.toFixed(1)}%`}>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${berthOccupancy}%` }}
          ></div>
        </div>
        <p className="text-xs text-center font-medium text-gray-300 mt-2 tracking-wider">{occupiedBerthIds.size} of {berths.length} BERTHS OCCUPIED</p>
      </StatCard>
      <StatCard icon={ShipIcon} title="Active Vessels" value={activeShips.length} />
      <StatCard icon={ChartBarIcon} title="Vessel Status Breakdown">
        <div className="flex justify-around text-xs text-center mt-2">
            {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status}>
                    <p className="font-bold text-lg text-white">{count}</p>
                    <p className="text-gray-400">{status}</p>
                </div>
            ))}
        </div>
      </StatCard>
    </div>
  );
};

export default DashboardStats;