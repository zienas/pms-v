import React from 'react';
import { toast } from 'react-hot-toast';
import { AlertType } from '../types';
import WarningIcon from './icons/WarningIcon';

interface GroupedAlertToastProps {
    count: number;
    alertType: AlertType;
    toastId: string;
}

const GroupedAlertToast: React.FC<GroupedAlertToastProps> = ({ count, alertType, toastId }) => {
    const message = alertType === AlertType.ERROR
        ? `${count} vessels require pilot assignment.`
        : `${count} new warnings.`;

    const handleViewAlerts = () => {
        // Dispatch a custom event that the main App component will listen for
        window.dispatchEvent(new CustomEvent('navigateTo', { detail: 'alerts' }));
        toast.dismiss(toastId);
    };

    return (
        <div className="bg-red-900/80 backdrop-blur-sm p-4 rounded-lg shadow-2xl border border-red-500/50 max-w-md w-full text-white">
            <div className="flex items-start gap-4">
                <WarningIcon className="w-8 h-8 flex-shrink-0 mt-1 text-red-500" />
                <div>
                    <p className="font-semibold text-lg text-red-400">Multiple Alerts</p>
                    <p className="text-md text-gray-200 mt-1">{message}</p>
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 border-t border-gray-700/50 pt-3 mt-3">
                <button onClick={() => toast.dismiss(toastId)} className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">
                    Dismiss
                </button>
                <button onClick={handleViewAlerts} className="px-3 py-1 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
                    View Alerts
                </button>
            </div>
        </div>
    );
};

export default GroupedAlertToast;