import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Ship, Berth } from '../types';
import { ShipStatus, InteractionEventType } from '../types';
import { usePort } from '../context/PortContext';
import { useLogger } from '../context/InteractionLoggerContext';

type AssignmentStatus = {
    isValid: boolean;
    message: string;
    berthIds: string[];
}

const ReassignBerthModal: React.FC<{ ship: Ship }> = ({ ship }) => {
  const { state, actions } = usePort();
  const { log } = useLogger();
  const { berths, ships } = state;
  const { updateShip, closeModal } = actions;

  const [primaryBerthId, setPrimaryBerthId] = useState<string>(ship.berthIds[0] || '');
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>({ isValid: true, message: '', berthIds: [] });
  
  const otherShips = useMemo(() => ships.filter(s => s.id !== ship.id), [ships, ship.id]);

  const checkBerthAssignment = useCallback((shipLength: number, shipDraft: number, selectedBerthId: string): AssignmentStatus => {
    if (!selectedBerthId) return { isValid: true, message: 'Vessel will be unassigned.', berthIds: [] };
    const primaryBerth = berths.find(b => b.id === selectedBerthId);
    if (!primaryBerth) return { isValid: false, message: 'Selected berth not found.', berthIds: [] };
    const isPrimaryOccupied = otherShips.some(s => s.berthIds.includes(primaryBerth.id));
    if (isPrimaryOccupied) {
        const occupyingShip = otherShips.find(s => s.berthIds.includes(primaryBerth.id));
        return { isValid: false, message: `Berth is already occupied by ${occupyingShip?.name}.`, berthIds: [] };
    }
    if (shipDraft > primaryBerth.maxDraft) return { isValid: false, message: `Ship draft (${shipDraft}m) exceeds berth limit (${primaryBerth.maxDraft}m).`, berthIds: [] };
    if (shipLength <= primaryBerth.maxLength) return { isValid: true, message: 'Assignment is valid.', berthIds: [primaryBerth.id] };
    const adjacentBerths = berths.filter(b => b.quayId === primaryBerth.quayId && Math.abs(b.positionOnQuay - primaryBerth.positionOnQuay) === 1);
    for (const adjacentBerth of adjacentBerths) {
        const isAdjacentOccupied = otherShips.some(s => s.berthIds.includes(adjacentBerth.id));
        if (!isAdjacentOccupied && shipDraft <= adjacentBerth.maxDraft) {
            const combinedLength = primaryBerth.maxLength + adjacentBerth.maxLength;
            if (shipLength <= combinedLength) return { isValid: true, message: `Requires adjacent berth ${adjacentBerth.name}.`, berthIds: [primaryBerth.id, adjacentBerth.id].sort() };
        }
    }
    return { isValid: false, message: 'Ship too long, no available adjacent berth found.', berthIds: [] };
  }, [berths, otherShips]);

  useEffect(() => {
    const status = checkBerthAssignment(ship.length, ship.draft, primaryBerthId);
    setAssignmentStatus(status);
  }, [primaryBerthId, ship.length, ship.draft, checkBerthAssignment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignmentStatus.isValid) {
      log(InteractionEventType.FORM_SUBMIT, {
        action: 'Reassign Berth',
        targetId: ship.id,
        value: `To berths: ${assignmentStatus.berthIds.join(',') || 'Unassigned'}`
      });

      let newStatus = ship.status;
      const isAssigning = assignmentStatus.berthIds.length > 0;
      const wasAssigned = ship.berthIds.length > 0;

      if (isAssigning && !wasAssigned) {
        newStatus = ShipStatus.DOCKED;
      } else if (!isAssigning && wasAssigned) {
        newStatus = ShipStatus.ANCHORED;
      }

      const shipToUpdate = {
        ...ship,
        berthIds: assignmentStatus.berthIds,
        status: newStatus,
      };
      
      updateShip(ship.id, shipToUpdate).then(closeModal);
    }
  };
  
  const handleCancel = () => {
    log(InteractionEventType.MODAL_CLOSE, {
        action: 'Cancel ReassignBerth',
        targetId: ship.id,
    });
    closeModal();
  };

  const getBerthSelectClasses = () => {
    const base = "mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2";
    if (!primaryBerthId) return `${base} border-gray-600 focus:ring-cyan-500`;
    if (!assignmentStatus.isValid) return `${base} border-red-500 focus:ring-red-500`;
    if (assignmentStatus.berthIds.length > 1) return `${base} border-blue-500 focus:ring-blue-500`;
    return `${base} border-green-500 focus:ring-green-500`;
  };
  
  const currentBerthNames = ship.berthIds.map(id => berths.find(b => b.id === id)?.name).join(', ') || 'Unassigned';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-2 text-white">Reassign Berth</h2>
        <p className="text-gray-300 mb-4">Vessel: <span className="font-semibold text-white">{ship.name}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-400">Current Assignment</label>
                <p className="mt-1 text-lg text-cyan-400">{currentBerthNames}</p>
            </div>
            
            <div>
                <label htmlFor="berthId" className="block text-sm font-medium text-gray-300">New Berth / Anchorage</label>
                <select id="berthId" name="berthId" value={primaryBerthId} onChange={e => setPrimaryBerthId(e.target.value)} className={getBerthSelectClasses()}>
                    <option value="">-- Unassign / To Anchorage --</option>
                    {berths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {assignmentStatus.message && (
                    <p className={`text-xs mt-1 ${!assignmentStatus.isValid ? 'text-red-400' : assignmentStatus.berthIds.length > 1 ? 'text-blue-400' : 'text-green-400'}`}>{assignmentStatus.message}</p>
                )}
                 {assignmentStatus.isValid && assignmentStatus.berthIds.length > 1 && (
                    <div className="mt-2 p-2 bg-blue-900/30 border border-blue-500/50 rounded-md text-sm">
                        <p className="font-semibold text-blue-300">Proposed Multi-Berth Assignment:</p>
                        <ul className="list-disc list-inside text-blue-400 text-xs mt-1">
                            {assignmentStatus.berthIds.map(id => { const berth = berths.find(b => b.id === id); return <li key={id}>{berth?.name || id}</li>; })}
                        </ul>
                    </div>
                )}
            </div>
            
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={handleCancel} data-logging-handler="true" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" data-logging-handler="true" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!assignmentStatus.isValid}>Reassign</button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignBerthModal;