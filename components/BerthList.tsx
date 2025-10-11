
import React from 'react';
import type { Berth, Ship } from '../types';
import { BerthType } from '../types';

interface BerthListProps {
  berths: Berth[];
  ships: Ship[];
}

const BerthList: React.FC<BerthListProps> = ({ berths, ships }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Berth Directory</h2>
      <ul className="space-y-3 h-[calc(100vh-180px)] overflow-y-auto pr-2">
        {berths.map(berth => {
          // FIX: Changed ship.berthId to ship.berthIds.includes(berth.id) to correctly check if a ship occupies a berth.
          const occupyingShip = ships.find(ship => ship.berthIds.includes(berth.id));
          const isOccupied = !!occupyingShip;
          return (
            <li key={berth.id} className={`p-3 rounded-lg shadow-md border-l-4 ${isOccupied ? 'bg-green-900/30 border-green-500' : 'bg-gray-700/50 border-gray-500'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">{berth.name}</p>
                  <p className="text-xs text-gray-400">{berth.type} - L: {berth.maxLength}m, D: {berth.maxDraft}m</p>
                </div>
                <div>
                  {isOccupied ? (
                    <span className="text-xs font-semibold text-green-300">Occupied by {occupyingShip.name}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Available</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BerthList;
