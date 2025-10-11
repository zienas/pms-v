
import React, { useState, useMemo } from 'react';
import type { Ship } from '../types';
import { ShipStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import EditIcon from './icons/EditIcon';
import DeleteIcon from './icons/DeleteIcon';

interface ShipListProps {
  ships: Ship[];
  onAddShip: () => void;
  onEditShip: (ship: Ship) => void;
  onDeleteShip: (id: string) => void;
}

const statusColors: { [key in ShipStatus]: string } = {
  [ShipStatus.APPROACHING]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500',
  [ShipStatus.DOCKED]: 'bg-green-500/20 text-green-300 border-green-500',
  [ShipStatus.DEPARTING]: 'bg-blue-500/20 text-blue-300 border-blue-500',
  [ShipStatus.ANCHORED]: 'bg-gray-500/20 text-gray-300 border-gray-500',
  [ShipStatus.LEFT_PORT]: 'bg-gray-600/20 text-gray-400 border-gray-600',
};

const ShipList: React.FC<ShipListProps> = ({ ships, onAddShip, onEditShip, onDeleteShip }) => {
  const [filter, setFilter] = useState('');
  const { currentUser } = useAuth();

  const canModify = useMemo(() => {
    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR;
  }, [currentUser.role]);

  const filteredShips = useMemo(() => {
    return ships.filter(ship => ship.name.toLowerCase().includes(filter.toLowerCase()) || ship.imo.includes(filter));
  }, [ships, filter]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Vessel Directory</h2>
        {canModify && (
          <button
            onClick={onAddShip}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
          >
            Add Ship
          </button>
        )}
      </div>
      <input
        type="text"
        placeholder="Filter by name or IMO..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      <ul className="space-y-3 h-[calc(100vh-250px)] overflow-y-auto pr-2">
        {filteredShips.map(ship => (
          <li key={ship.id} className="p-3 bg-gray-700/50 rounded-lg shadow-md hover:bg-gray-700 transition-colors group">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">{ship.name}</p>
                <p className="text-xs text-gray-400">IMO: {ship.imo}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[ship.status]}`}>{ship.status}</span>
                {canModify && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => onEditShip(ship)} className="p-1 text-gray-300 hover:text-cyan-400" aria-label={`Edit ${ship.name}`}>
                       <EditIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDeleteShip(ship.id)} className="p-1 text-gray-300 hover:text-red-500" aria-label={`Delete ${ship.name}`}>
                      <DeleteIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShipList;