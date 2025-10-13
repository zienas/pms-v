import React, { useState, useMemo } from 'react';
import type { Ship } from '../types';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';

const AssignPilotModal: React.FC<{ ship: Ship }> = ({ ship }) => {
  const { users } = useAuth();
  const { actions } = usePort();
  const { updateShip, closeModal } = actions;

  const pilots = useMemo(() => users.filter(user => user.role === UserRole.PILOT), [users]);
  const [selectedPilotId, setSelectedPilotId] = useState<string>(pilots[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPilotId) {
      return;
    }
    const shipToUpdate = { ...ship, pilotId: selectedPilotId };
    updateShip(ship.id, shipToUpdate).then(closeModal);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-2 text-white">Assign Pilot</h2>
        <p className="text-gray-300 mb-4">Vessel: <span className="font-semibold text-white">{ship.name}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pilotId" className="block text-sm font-medium text-gray-300">Available Pilots</label>
            <select
              id="pilotId"
              name="pilotId"
              value={selectedPilotId}
              onChange={e => setSelectedPilotId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {pilots.length === 0 ? (
                <option value="" disabled>-- No Pilots Available --</option>
              ) : (
                pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              )}
            </select>
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!selectedPilotId || pilots.length === 0}>
              Assign Pilot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignPilotModal;