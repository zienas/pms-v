import React, { useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { ShipStatus, UserRole } from '../types';
import VesselPilotCard from '../components/VesselPilotCard';

const PilotPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { state, actions } = usePort();
    const { ships, isLoading } = state;

    // Data is already loaded by the MainApp component, so we just use it.

    const assignedVessels = useMemo(() => {
        if (!currentUser || currentUser.role !== UserRole.PILOT) return [];
        return ships.filter(ship => 
            ship.pilotId === currentUser.id && 
            ship.status !== ShipStatus.LEFT_PORT
        ).sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());
    }, [ships, currentUser]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Loading assigned vessels...</p>
            </div>
        );
    }

    return (
        <>
            <h1 className="text-2xl font-bold text-white mb-4">Pilot Log: Assigned Vessels</h1>
            {assignedVessels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {assignedVessels.map(ship => (
                        <VesselPilotCard key={ship.id} ship={ship} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-4 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-gray-400">You have no active vessels assigned to you.</p>
                </div>
            )}
        </>
    );
};

export default PilotPage;