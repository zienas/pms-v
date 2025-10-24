import React, { useState, useMemo } from 'react';
import type { Alert } from '../types';
import { AlertType, UserRole } from '../types';
import WarningIcon from '../components/icons/WarningIcon';
import { usePort } from '../context/PortContext';
import { useAuth } from '../context/AuthContext';

const alertStyles: Record<AlertType, { iconColor: string; borderColor: string; bgColor: string }> = {
  [AlertType.ERROR]: {
    iconColor: 'text-red-500',
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-900/30',
  },
  [AlertType.WARNING]: {
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-900/30',
  },
};

type FilterType = 'all' | AlertType;
type FilterStatus = 'all' | 'acknowledged' | 'unacknowledged';

const AlertsDashboard: React.FC = () => {
   const { state, actions } = usePort();
   const { currentUser } = useAuth();
   const { alerts, ships } = state;
   const [filterType, setFilterType] = useState<FilterType>('all');
   const [filterStatus, setFilterStatus] = useState<FilterStatus>('unacknowledged');

   const filteredAlerts = useMemo(() => {
     let alertsToFilter = alerts;

     if (currentUser?.role === UserRole.PILOT) {
        const assignedShipIds = new Set(ships.filter(s => s.pilotId === currentUser.id).map(s => s.id));
        alertsToFilter = alerts.filter(alert => alert.shipId && assignedShipIds.has(alert.shipId));
     } else if (currentUser?.role === UserRole.AGENT) {
        const assignedShipIds = new Set(ships.filter(s => s.agentId === currentUser.id).map(s => s.id));
        alertsToFilter = alerts.filter(alert => alert.shipId && assignedShipIds.has(alert.shipId));
     }

     return alertsToFilter.filter(alert => {
       const typeMatch = filterType === 'all' || alert.type === filterType;
       const statusMatch = filterStatus === 'all' ||
         (filterStatus === 'acknowledged' && alert.acknowledged) ||
         (filterStatus === 'unacknowledged' && !alert.acknowledged);
       return typeMatch && statusMatch;
     });
   }, [alerts, filterType, filterStatus, currentUser, ships]);

   const handleTakeAction = (alert: Alert) => {
     const ship = ships.find(s => s.id === alert.shipId);
     if (ship) {
       if (alert.id.startsWith('alert-pilot-')) {
         actions.openModal({ type: 'assignPilot', ship });
       } else {
         // Fallback for other potential actions
         actions.openModal({ type: 'shipForm', ship });
       }
     }
   };

   if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-900/50 rounded-lg">
        <WarningIcon className="w-24 h-24 mb-4 opacity-30" />
        <h1 className="text-2xl font-bold">No Active Alerts</h1>
        <p className="text-md mt-2">The port operations are currently clear.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Active Alerts ({filteredAlerts.length})</h1>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <label htmlFor="filter-type" className="sr-only">Filter by Type</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Types</option>
              <option value={AlertType.ERROR}>Error</option>
              <option value={AlertType.WARNING}>Warning</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="sr-only">Filter by Status</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="unacknowledged">Unacknowledged</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-3 pr-2">
            {filteredAlerts.map(alert => {
              const styles = alertStyles[alert.type];
              return (
                <li key={alert.id} className={`p-4 rounded-lg flex flex-col gap-3 border ${styles.borderColor} ${alert.acknowledged ? 'bg-gray-800/60' : styles.bgColor} transition-all`}>
                  <div className={`flex items-start gap-4 ${alert.acknowledged ? 'opacity-70' : ''}`}>
                    <WarningIcon className={`w-8 h-8 flex-shrink-0 mt-1 ${styles.iconColor}`} />
                    <div>
                      <p className={`font-semibold text-lg ${styles.iconColor}`}>{alert.type}</p>
                      <p className="text-md text-gray-200 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-2 border-t border-gray-700/50 pt-3">
                      {alert.acknowledged ? (
                          <span className="text-xs text-green-400 font-semibold mr-auto px-2">Acknowledged</span>
                      ) : (
                          <button onClick={() => actions.acknowledgeAlert(alert.id)} className="px-3 py-1 text-sm bg-green-700 text-white rounded-md hover:bg-green-600">ACK</button>
                      )}
                      <button onClick={() => actions.removeAlert(alert.id)} className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">Discard</button>
                      {alert.shipId && <button onClick={() => handleTakeAction(alert)} className="px-3 py-1 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700">Take Action</button>}
                  </div>
                </li>
              );
            })}
            {filteredAlerts.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                  <p>No alerts match the current filter.</p>
              </div>
            )}
        </ul>
      </div>
    </div>
  );
};

export default AlertsDashboard;