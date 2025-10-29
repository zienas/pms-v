import React, { useState, useMemo } from 'react';
import type { Ship, ShipMovement } from '../types';
import { MovementEventType } from '../types';
import { usePort } from '../context/PortContext';
import { toast } from 'react-hot-toast';

interface VesselPilotCardProps {
    ship: Ship;
}

const VesselPilotCard: React.FC<VesselPilotCardProps> = ({ ship }) => {
    const { actions, state } = usePort();
    const [onboardTime, setOnboardTime] = useState(new Date().toISOString().substring(0, 16));
    const [onboardComments, setOnboardComments] = useState('');
    const [offboardTime, setOffboardTime] = useState(new Date().toISOString().substring(0, 16));
    const [offboardComments, setOffboardComments] = useState('');

    const lastLog = useMemo(() => {
        const relevantMovements = state.movements
            .filter(m => m.shipId === ship.id && (m.eventType === MovementEventType.PILOT_ONBOARD || m.eventType === MovementEventType.PILOT_OFFBOARD))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const lastOnboard = relevantMovements.find(m => m.eventType === MovementEventType.PILOT_ONBOARD);
        const lastOffboard = relevantMovements.find(m => m.eventType === MovementEventType.PILOT_OFFBOARD);
        
        return { lastOnboard, lastOffboard };
    }, [state.movements, ship.id]);

    const handleOnboardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const message = `Pilot boarded vessel. ${onboardComments ? `Comments: ${onboardComments}` : ''}`;
        actions.addMovementLog(ship, MovementEventType.PILOT_ONBOARD, message);
        setOnboardComments(''); // Reset form
    };

    const handleOffboardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const message = `Pilot left vessel. ${offboardComments ? `Comments: ${offboardComments}` : ''}`;
        actions.addMovementLog(ship, MovementEventType.PILOT_OFFBOARD, message);
        setOffboardComments(''); // Reset form
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col gap-4 shadow-lg">
            <div>
                <h3 className="text-lg font-bold text-white">{ship.name}</h3>
                <p className="text-sm text-gray-400">IMO: {ship.imo}</p>
                <p className="text-sm text-gray-400">Status: {ship.status}</p>
            </div>

            {/* Log Onboard Form */}
            <form onSubmit={handleOnboardSubmit} className="space-y-3 bg-gray-900/50 p-3 rounded-md border border-gray-600">
                <h4 className="font-semibold text-cyan-400">Log Time Onboard</h4>
                 {lastLog.lastOnboard && (
                    <p className="text-xs text-gray-400">Last onboard time logged: {new Date(lastLog.lastOnboard.timestamp).toLocaleString()}</p>
                )}
                <div>
                    <label htmlFor={`onboard-comments-${ship.id}`} className="block text-sm font-medium text-gray-300">Comments</label>
                    <textarea
                        id={`onboard-comments-${ship.id}`}
                        value={onboardComments}
                        onChange={(e) => setOnboardComments(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Optional comments..."
                    />
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">
                    Log Onboard Now
                </button>
            </form>

            {/* Log Offboard Form */}
            <form onSubmit={handleOffboardSubmit} className="space-y-3 bg-gray-900/50 p-3 rounded-md border border-gray-600">
                <h4 className="font-semibold text-orange-400">Log Time Left Vessel</h4>
                 {lastLog.lastOffboard && (
                    <p className="text-xs text-gray-400">Last offboard time logged: {new Date(lastLog.lastOffboard.timestamp).toLocaleString()}</p>
                )}
                <div>
                    <label htmlFor={`offboard-comments-${ship.id}`} className="block text-sm font-medium text-gray-300">Comments</label>
                    <textarea
                        id={`offboard-comments-${ship.id}`}
                        value={offboardComments}
                        onChange={(e) => setOffboardComments(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Optional comments..."
                    />
                </div>
                <button type="submit" className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors">
                    Log Offboard Now
                </button>
            </form>
        </div>
    );
};

export default VesselPilotCard;