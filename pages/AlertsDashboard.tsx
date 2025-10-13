import React from 'react';
import type { Alert } from '../types';
import { AlertType } from '../types';
import WarningIcon from '../components/icons/WarningIcon';
import { usePort } from '../context/PortContext';

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

const AlertsDashboard: React.FC = () => {
   const { state, actions } = usePort();
   const { alerts, ships } = state;

   const handleTakeAction = (shipId: string) => {
     const ship = ships.find(s => s.id === shipId);
     if (ship) {
       actions.openModal({ type: 'shipForm', ship });
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
       <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Active Alerts ({alerts.filter(a => !a.acknowledged).length})</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-3 pr-2">
            {alerts.map(alert => {
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
                      {alert.shipId && <button onClick={() => handleTakeAction(alert.shipId)} className="px-3 py-1 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700">Take Action</button>}
                  </div>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
};

export default AlertsDashboard;
