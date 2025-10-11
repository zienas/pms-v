import React from 'react';
import type { Berth, Ship } from '../types';
import { ShipStatus, UserRole } from '../types';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/SortIcon';
import { useAuth } from '../context/AuthContext';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import { usePort } from '../context/PortContext';

const statusColors: { [key in ShipStatus]: string } = {
  [ShipStatus.APPROACHING]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500',
  [ShipStatus.DOCKED]: 'bg-green-500/20 text-green-300 border-green-500',
  [ShipStatus.DEPARTING]: 'bg-blue-500/20 text-blue-300 border-blue-500',
  [ShipStatus.ANCHORED]: 'bg-gray-500/20 text-gray-300 border-gray-500',
  [ShipStatus.LEFT_PORT]: 'bg-gray-600/20 text-gray-400 border-gray-600',
};

const BerthDirectory: React.FC = () => {
  const { currentUser } = useAuth();
  const { berths, ships, openBerthFormModal, deleteBerth, openShipFormModal, openBerthDetailModal } = usePort();
  
  const { items: sortedBerths, requestSort, sortConfig } = useSortableData<Berth>(berths, { key: 'name', direction: 'ascending' });
  
  const canManageBerths = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CAPTAIN;
  const canManageShips = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR;

  const getSortDirectionFor = (key: keyof Berth) => {
    if (!sortConfig) return undefined;
    return sortConfig.key === key ? sortConfig.direction : undefined;
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Berth Directory</h1>
        {canManageBerths && (
            <button
                onClick={() => openBerthFormModal(null)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
                Add Berth
            </button>
        )}
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
          <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
            <tr>
              <th className="px-4 py-3">
                <button onClick={() => requestSort('name')} className="flex items-center gap-1 hover:text-white">
                    Berth Name <SortIcon direction={getSortDirectionFor('name')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => requestSort('type')} className="flex items-center gap-1 hover:text-white">
                    Type <SortIcon direction={getSortDirectionFor('type')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => requestSort('maxLength')} className="flex items-center gap-1 hover:text-white">
                    Max Length (m) <SortIcon direction={getSortDirectionFor('maxLength')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => requestSort('maxDraft')} className="flex items-center gap-1 hover:text-white">
                    Max Draft (m) <SortIcon direction={getSortDirectionFor('maxDraft')} />
                </button>
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Occupying Vessel(s)</th>
              {canManageBerths && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedBerths.map(berth => {
              const occupyingShips = ships.filter(ship => 
                ship.berthIds.includes(berth.id) && ship.status !== ShipStatus.LEFT_PORT
              );
              const isOccupied = occupyingShips.length > 0;
              return (
                <tr key={berth.id} onClick={() => openBerthDetailModal(berth)} className="hover:bg-gray-800/50 group cursor-pointer">
                  <td className="px-4 py-3 font-medium text-white">{berth.name}</td>
                  <td className="px-4 py-3">{berth.type}</td>
                  <td className="px-4 py-3">{berth.maxLength}</td>
                  <td className="px-4 py-3">{berth.maxDraft}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isOccupied ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                        {isOccupied ? (
                          <span className="text-green-400 font-semibold">Occupied</span>
                        ) : (
                          <span className="text-gray-400">Available</span>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isOccupied ? (
                        <div className="flex flex-col gap-2">
                            {occupyingShips.map(ship => (
                                <div key={ship.id} className="flex justify-between items-center gap-2">
                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                        <span className="font-medium text-white truncate">{ship.name}</span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border whitespace-nowrap ${statusColors[ship.status]}`}>{ship.status}</span>
                                    </div>
                                    {canManageShips && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); openShipFormModal(ship); }}
                                            className="px-2 py-1 bg-cyan-600/50 text-cyan-200 rounded text-xs hover:bg-cyan-600 hover:text-white transition-colors flex-shrink-0"
                                        >
                                            Manage
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-gray-400">—</span>
                    )}
                  </td>
                   {canManageBerths && (
                    <td className="px-4 py-3 text-right">
                         <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openBerthFormModal(berth); }} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit Berth">
                                <EditIcon className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteBerth(berth.portId, berth.id); }} className="p-1 text-gray-300 hover:text-red-500" title="Delete Berth">
                                <DeleteIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </td>
                   )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BerthDirectory;