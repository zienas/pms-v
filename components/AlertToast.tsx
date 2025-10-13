import React from 'react';
import { toast } from 'react-hot-toast';
import { usePort } from '../context/PortContext';
import type { Alert } from '../types';
import WarningIcon from './icons/WarningIcon';

interface AlertToastProps {
    alert: Alert;
    toastId: string;
}

const AlertToast: React.FC<AlertToastProps> = ({ alert, toastId }) => {
    const { state, actions } = usePort();
    const { ships } = state;

    const handleAcknowledge = () => {
        actions.acknowledgeAlert(alert.id);
        toast.dismiss(toastId);
    };

    const handleDiscard = () => {
        actions.removeAlert(alert.id);
        toast.dismiss(toastId);
    };

    const handleTakeAction = () => {
        const ship = ships.find(s => s.id === alert.shipId);
        if (ship) {
            actions.openModal({ type: 'assignPilot', ship });
        }
        toast.dismiss(toastId);
    };

    return (
        <div className="bg-red-900/80 backdrop-blur-sm p-4 rounded-lg shadow-2xl border border-red-500/50 max-w-md w-full text-white">
            <div className="flex items-start gap-4">
                <WarningIcon className="w-8 h-8 flex-shrink-0 mt-1 text-red-500" />
                <div>
                    <p className="font-semibold text-lg text-red-400">{alert.type}</p>
                    <p className="text-md text-gray-200 mt-1">{alert.message}</p>
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 border-t border-gray-700/50 pt-3 mt-3">
                <button onClick={handleAcknowledge} className="px-3 py-1 text-sm bg-green-700 text-white rounded-md hover:bg-green-600">
                    Ack
                </button>
                <button onClick={handleDiscard} className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">
                    Discard
                </button>
                <button onClick={handleTakeAction} className="px-3 py-1 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
                    Take Action
                </button>
            </div>
        </div>
    );
};

export default AlertToast;