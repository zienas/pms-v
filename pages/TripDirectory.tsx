import React, { useState, useMemo } from 'react';
import type { Trip } from '../types';
import { TripStatus, UserRole, InteractionEventType } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { useSortableData } from '../hooks/useSortableData';
import { useLogger } from '../context/InteractionLoggerContext';
import SortIcon from '../components/icons/SortIcon';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import { formatDuration } from '../utils/formatters';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import { toast } from 'react-hot-toast';

const statusColors: { [key in TripStatus]: string } = {
  [TripStatus.ACTIVE]: 'bg-green-500/20 text-green-300 border-green-500',
  [TripStatus.COMPLETED]: 'bg-gray-500/20 text-gray-400 border-gray-600',
};

const TripDirectory: React.FC = () => {
  const { state, actions } = usePort();
  const { trips, selectedPort, ships } = state;
  const { currentUser, users } = useAuth();
  const { log } = useLogger();

  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

  const canExport = useMemo(() => !!currentUser && [UserRole.ADMIN, UserRole.SUPERVISOR].includes(currentUser.role), [currentUser]);

  const filteredTrips = useMemo(() => {
    let tripsToFilter = trips;
    if (currentUser?.role === UserRole.AGENT) {
        tripsToFilter = trips.filter(trip => trip.agentId === currentUser.id);
    } else if (currentUser?.role === UserRole.PILOT) {
        tripsToFilter = trips.filter(trip => trip.pilotId === currentUser.id);
    }
    
    return tripsToFilter
      .filter(trip => statusFilter === 'all' || trip.status === statusFilter)
      .filter(trip => {
          const lowerCaseFilter = filter.toLowerCase();
          return (
              trip.id.toLowerCase().includes(lowerCaseFilter) ||
              trip.vesselName?.toLowerCase().includes(lowerCaseFilter) ||
              trip.vesselImo?.includes(lowerCaseFilter)
          );
      });
  }, [trips, filter, statusFilter, currentUser]);

  const { items: sortedTrips, requestSort, sortConfig } = useSortableData<Trip>(filteredTrips, { key: 'arrivalTimestamp', direction: 'descending' });

  const getSortDirectionFor = (key: keyof Trip) => {
    if (!sortConfig) return undefined;
    return sortConfig.key === key ? sortConfig.direction : undefined;
  };
  
  const handleRequestSort = (key: keyof Trip) => {
    log(InteractionEventType.SORT_APPLIED, { action: 'Sort trips', value: key });
    requestSort(key);
  };

  const handleExportCSV = () => {
    if (!selectedPort) return;
    log(InteractionEventType.DATA_EXPORT, { action: 'Export Trip Directory to CSV' });
    const dataToExport = sortedTrips.map(trip => ({
      'Trip ID': trip.id,
      'Vessel Name': trip.vesselName,
      'IMO': trip.vesselImo,
      'Status': trip.status,
      'Arrival': new Date(trip.arrivalTimestamp).toLocaleString(),
      'Departure': trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : '',
      'Duration': trip.departureTimestamp ? formatDuration(new Date(trip.departureTimestamp).getTime() - new Date(trip.arrivalTimestamp).getTime()) : 'Active',
      'Agent': trip.agentId ? userMap.get(trip.agentId) || 'Unknown' : 'N/A',
      'Pilot': trip.pilotId ? userMap.get(trip.pilotId) || 'Unknown' : 'N/A',
    }));
    downloadCSV(dataToExport, `trip_directory_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
  };
  
  const handleViewDetails = (trip: Trip) => {
    log(InteractionEventType.MODAL_OPEN, {
        action: 'Open TripDetail',
        targetId: trip.id,
        value: trip.vesselName,
    });
    actions.openModal({ type: 'tripDetail', trip });
  };
  
  const handleOpenVesselHistory = (trip: Trip) => {
    const ship = ships.find(s => s.id === trip.shipId);
    if (ship) {
      log(InteractionEventType.MODAL_OPEN, {
          action: 'Open ShipHistory (from Trip DblClick)',
          targetId: ship.id,
          value: ship.name,
      });
      actions.openModal({ type: 'history', ship });
    } else {
      toast.error(`Could not find vessel details for this trip.`);
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col" data-log-context="Trip Directory">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Trip Directory</h1>
        {canExport && <button onClick={handleExportCSV} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>}
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input type="text" placeholder="Filter by Vessel Name, IMO, or Trip ID..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TripStatus | 'all')} className="w-full md:w-auto px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">All Statuses</option>
            {Object.values(TripStatus).map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                <tr>
                    {['vesselName', 'vesselImo', 'id', 'status', 'arrivalTimestamp', 'departureTimestamp', 'agentId', 'pilotId'].map(key => (
                        <th className="px-4 py-3" key={key}>
                            <button onClick={() => handleRequestSort(key as keyof Trip)} className="flex items-center gap-1 hover:text-white capitalize">
                                {key.replace('vesselName', 'Vessel').replace('vesselImo', 'IMO').replace('id', 'Trip ID').replace('Timestamp', '').replace('Id', '')}
                                <SortIcon direction={getSortDirectionFor(key as keyof Trip)} />
                            </button>
                        </th>
                    ))}
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {sortedTrips.map(trip => (
                    <tr 
                        key={trip.id} 
                        onDoubleClick={() => handleOpenVesselHistory(trip)}
                        className="group hover:bg-gray-800/50 cursor-pointer"
                        title="Double-click to view vessel history"
                    >
                        <td className="px-4 py-3 font-medium text-white">{trip.vesselName}</td>
                        <td className="px-4 py-3">{trip.vesselImo}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{trip.id.split('-')[1]}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full border border-current ${statusColors[trip.status]}`}>{trip.status}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(trip.arrivalTimestamp).toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3">{trip.agentId ? userMap.get(trip.agentId) || 'Unknown' : '—'}</td>
                        <td className="px-4 py-3">{trip.pilotId ? userMap.get(trip.pilotId) || 'Unknown' : '—'}</td>
                        <td className="px-4 py-3">{trip.departureTimestamp ? formatDuration(new Date(trip.departureTimestamp).getTime() - new Date(trip.arrivalTimestamp).getTime()) : 'Active'}</td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleViewDetails(trip)} className="p-1 text-gray-300 hover:text-cyan-400" title="View Trip Details"><DocumentTextIcon className="h-5 w-5" /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {sortedTrips.length === 0 && <div className="text-center py-8 text-gray-500">No trips match the current filters.</div>}
      </div>
    </div>
  );
};

export default TripDirectory;
