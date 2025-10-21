import React, { useState, useMemo } from 'react';
import type { Berth, Ship } from '../types';
import { ShipStatus, UserRole, BerthType, MovementEventType } from '../types';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import { useAuth } from '../context/AuthContext';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import { usePort } from '../context/PortContext';
import BerthIcon from '../components/icons/BerthIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import FireIcon from '../components/icons/FlameIcon';

const berthTypeColors: { [key in BerthType]: string } = {
  [BerthType.QUAY]: 'bg-blue-500/20 text-blue-300',
  [BerthType.BERTH]: 'bg-indigo-500/20 text-indigo-300',
  [BerthType.ANCHORAGE]: 'bg-gray-500/20 text-gray-300',
};

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number }> = ({ icon: Icon, title, value }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex items-center">
        <div className="p-3 bg-cyan-500/10 rounded-full mr-4"><Icon className="w-6 h-6 text-cyan-400" /></div>
        <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const OccupancyBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    const color = percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500';
    return (
        <div className="w-full bg-gray-700 rounded-full h-2.5" title={`${percentage.toFixed(1)}% occupied in last 24h`}>
            <div
                className={`${color} h-2.5 rounded-full`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};


const BerthDirectory: React.FC = () => {
  const { currentUser } = useAuth();
  const { state, actions } = usePort();
  const { berths, ships, selectedPort, movements } = state;
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<BerthType | 'all'>('all');

  const stats = useMemo(() => {
    const totalBerths = berths.length;
    const occupiedBerthIds = new Set(ships.filter(s => s.status !== ShipStatus.LEFT_PORT).flatMap(s => s.berthIds));
    const occupiedCount = occupiedBerthIds.size;
    const availableCount = totalBerths - occupiedCount;
    const occupancyRate = totalBerths > 0 ? (occupiedCount / totalBerths) * 100 : 0;
    return { totalBerths, occupiedCount, availableCount, occupancyRate };
  }, [berths, ships]);

  const occupancyData = useMemo(() => {
    if (!movements || movements.length === 0) return new Map<string, number>();

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const occupancyMap = new Map<string, number>();

    berths.forEach(berth => {
        type BerthEvent = { timestamp: number; type: 'enter' | 'leave' };
        const events: BerthEvent[] = [];

        movements.forEach(movement => {
            if (movement.eventType !== MovementEventType.BERTH_ASSIGNMENT) return;
            
            const eventTime = new Date(movement.timestamp).getTime();
            const wasOccupied = movement.details.fromBerthIds?.includes(berth.id) ?? false;
            const isOccupied = movement.details.berthIds?.includes(berth.id) ?? false;

            if (!wasOccupied && isOccupied) events.push({ timestamp: eventTime, type: 'enter' });
            if (wasOccupied && !isOccupied) events.push({ timestamp: eventTime, type: 'leave' });
        });
        
        events.sort((a, b) => a.timestamp - b.timestamp);

        let totalOccupiedMs = 0;
        let lastEventTime = twentyFourHoursAgo;
        let currentStateIsOccupied = false;

        const lastEventBeforeWindow = events.filter(e => e.timestamp < twentyFourHoursAgo).pop();
        if (lastEventBeforeWindow) {
            currentStateIsOccupied = lastEventBeforeWindow.type === 'enter';
        }

        const relevantEvents = events.filter(e => e.timestamp >= twentyFourHoursAgo);
        for (const event of relevantEvents) {
            const eventTime = event.timestamp;
            if (currentStateIsOccupied) {
                totalOccupiedMs += (eventTime - lastEventTime);
            }
            currentStateIsOccupied = (event.type === 'enter');
            lastEventTime = eventTime;
        }

        if (currentStateIsOccupied) {
            totalOccupiedMs += (now - lastEventTime);
        }

        const occupancyPercent = (totalOccupiedMs / (24 * 60 * 60 * 1000)) * 100;
        occupancyMap.set(berth.id, Math.min(100, occupancyPercent));
    });

    return occupancyMap;
  }, [berths, movements]);

  const filteredBerths = useMemo(() => {
    return berths
        .filter(berth => typeFilter === 'all' || berth.type === typeFilter)
        .filter(berth => berth.name.toLowerCase().includes(filter.toLowerCase()));
  }, [berths, filter, typeFilter]);
  
  const { items: sortedBerths, requestSort, sortConfig } = useSortableData<Berth>(filteredBerths, { key: 'name', direction: 'ascending' });
  
  const canManageBerths = useMemo(() => currentUser?.role === UserRole.ADMIN, [currentUser]);
  const canManageShips = useMemo(() => !!currentUser && [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR].includes(currentUser.role), [currentUser]);

  const getSortDirectionFor = (key: keyof Berth) => sortConfig?.key === key ? sortConfig.direction : undefined;

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Berth Directory</h1>
        {canManageBerths && selectedPort && (
            <button onClick={() => actions.openModal({ type: 'berthForm', port: selectedPort, berth: null })} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Add Berth</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={BerthIcon} title="Total Berths" value={stats.totalBerths} />
        <StatCard icon={BerthIcon} title="Occupied" value={stats.occupiedCount} />
        <StatCard icon={BerthIcon} title="Available" value={stats.availableCount} />
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center">
                <div className="p-3 bg-cyan-500/10 rounded-full mr-4"><ChartBarIcon className="w-6 h-6 text-cyan-400" /></div>
                <div>
                    <p className="text-sm text-gray-400 font-medium">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-white">{stats.occupancyRate.toFixed(1)}%</p>
                </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2"><div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input type="text" placeholder="Filter by berth name..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full md:w-1/2 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as BerthType | 'all')} className="w-full md:w-auto px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="all">All Types</option>
            {Object.values(BerthType).map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
          <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
            <tr>
              {['name', 'type', 'maxLength', 'maxDraft'].map(key => (
                <th className="px-4 py-3" key={key}><button onClick={() => requestSort(key as keyof Berth)} className="flex items-center gap-1 hover:text-white capitalize">{key.replace('Length', ' Length (m)').replace('Draft', ' Draft (m)')} <SortIcon direction={getSortDirectionFor(key as keyof Berth)} /></button></th>
              ))}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Occupying Vessel</th>
              <th className="px-4 py-3">24h Occupancy</th>
              {canManageBerths && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedBerths.map(berth => {
              const occupyingShip = ships.find(s => s.berthIds.includes(berth.id) && s.status !== ShipStatus.LEFT_PORT);
              const hasDangerousGoods = occupyingShip?.hasDangerousGoods;
              return (
                <tr key={berth.id} onClick={() => actions.openModal({ type: 'berthDetail', berth })} className={`group cursor-pointer transition-colors ${hasDangerousGoods ? 'bg-red-900/20 hover:bg-red-900/40' : 'hover:bg-gray-800/50'}`}>
                  <td className="px-4 py-3 font-medium text-white">{berth.name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${berthTypeColors[berth.type]}`}>{berth.type}</span></td>
                  <td className="px-4 py-3">{berth.maxLength}m</td>
                  <td className="px-4 py-3">{berth.maxDraft}m</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${occupyingShip ? (hasDangerousGoods ? 'text-red-300 bg-red-900/50' : 'text-green-300 bg-green-900/50') : 'text-gray-300 bg-gray-700/50'}`}>{occupyingShip ? 'Occupied' : 'Available'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {occupyingShip ? (
                        <div className="flex justify-between items-center gap-2">
                           <div className="flex items-center gap-2 truncate">
                               {hasDangerousGoods && <FireIcon className="w-4 h-4 text-red-400 flex-shrink-0" title="Carrying Dangerous Goods" />}
                               <span className={`font-medium truncate ${hasDangerousGoods ? 'text-red-300' : 'text-white'}`}>{occupyingShip.name}</span>
                           </div>
                           {canManageShips && <button onClick={(e) => { e.stopPropagation(); actions.openModal({ type: 'shipForm', ship: occupyingShip }); }} className="px-2 py-1 bg-cyan-600/50 text-cyan-200 rounded text-xs hover:bg-cyan-600">Manage</button>}
                        </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <OccupancyBar percentage={occupancyData.get(berth.id) || 0} />
                        <span className="text-xs font-mono w-12 text-right">
                            {`${(occupancyData.get(berth.id) || 0).toFixed(0)}%`}
                        </span>
                    </div>
                  </td>
                   {canManageBerths && (
                    <td className="px-4 py-3 text-right">
                         <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); if(selectedPort) actions.openModal({ type: 'berthForm', port: selectedPort, berth }); }} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit Berth"><EditIcon className="h-4 w-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); actions.deleteBerth(berth.portId, berth.id); }} className="p-1 text-gray-300 hover:text-red-500" title="Delete Berth"><DeleteIcon className="h-4 w-4" /></button>
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