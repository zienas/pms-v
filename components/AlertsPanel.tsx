
import React from 'react';
import type { Alert } from '../types';
import { AlertType } from '../types';
import WarningIcon from './icons/WarningIcon';

interface AlertsPanelProps {
  alerts: Alert[];
}

const alertStyles = {
  [AlertType.ERROR]: {
    iconColor: 'text-red-500',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-900/30',
  },
  [AlertType.WARNING]: {
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-900/30',
  },
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <WarningIcon className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-bold">No Active Alerts</h2>
        <p className="text-sm">The port operations are currently clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Active Alerts</h2>
      <ul className="space-y-3 h-[calc(100vh-180px)] overflow-y-auto pr-2">
        {alerts.map(alert => {
          const styles = alertStyles[alert.type];
          return (
            <li key={alert.id} className={`p-3 rounded-lg flex items-start gap-3 border-l-4 ${styles.borderColor} ${styles.bgColor}`}>
              <WarningIcon className={`w-6 h-6 flex-shrink-0 mt-1 ${styles.iconColor}`} />
              <div>
                <p className="font-semibold text-white">{alert.type}</p>
                <p className="text-sm text-gray-300">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                    {alert.timestamp && !isNaN(new Date(alert.timestamp).getTime())
                        ? new Date(alert.timestamp).toLocaleString()
                        : 'Invalid date'}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AlertsPanel;