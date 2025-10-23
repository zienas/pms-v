import React, { useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { ShipStatus, UserRole } from '../types';
import VesselPilotCard from '../components/VesselPilotCard';
import { DEFAULT_APP_LOGO_PNG } from '../utils/pdfUtils';

const PilotPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { state, actions } = usePort();
    const { ships, isLoading, selectedPort } = state;

    // Load initial data when the pilot logs in
    useEffect(() => {
        actions.loadInitialPorts();
    }, [actions]);

    useEffect(() => {
        if (state.selectedPortId) {
            const controller = new AbortController();
            actions.fetchDataForPort(state.selectedPortId, controller.signal);
            return () => controller.abort();
        }
    }, [state.selectedPortId, actions]);

    const assignedVessels = useMemo(() => {
        if (!currentUser || currentUser.role !== UserRole.PILOT) return [];
        return ships.filter(ship => 
            ship.pilotId === currentUser.id && 
            ship.status !== ShipStatus.LEFT_PORT
        );
    }, [ships, currentUser]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <p>Loading assigned vessels...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700 shadow-md">
                <div className="flex items-center">
                    <img
                        src={selectedPort?.logoImage || DEFAULT_APP_LOGO_PNG}
                        alt="Port logo"
                        className="w-8 h-8 object-contain mr-3 rounded-md bg-gray-700/50 p-1"
                    />
                    <h1 className="text-xl font-bold text-white tracking-wider">
                        Pilot Log
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
                        <p className="text-xs text-cyan-400">{currentUser?.role}</p>
                    </div>
                    <button 
                        onClick={() => logout()} 
                        className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Your Assigned Vessels</h2>
                {assignedVessels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assignedVessels.map(ship => (
                            <VesselPilotCard key={ship.id} ship={ship} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-4 bg-gray-800 rounded-lg border border-gray-700">
                        <p className="text-gray-400">You have no active vessels assigned to you.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PilotPage;
