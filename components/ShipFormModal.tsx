import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Ship, Berth, User } from '../types';
import { ShipStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { playNotificationSound } from '../utils/audio';
import { usePort } from '../context/PortContext';

interface ShipFormModalProps {
  pilots: User[];
  agents: User[];
}

type AssignmentStatus = {
    isValid: boolean;
    message: string;
    berthIds: string[];
}

const InputField: React.FC<{
  label: string;
  name: string;
  type: string;
  value: any;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, type, value, error, onChange }) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};


const ShipFormModal: React.FC<ShipFormModalProps> = ({ pilots, agents }) => {
  const { currentUser } = useAuth();
  const { editingShip: shipToEdit, berths, ships, addShip, updateShip, closeShipFormModal } = usePort();

  const [formData, setFormData] = useState<Omit<Ship, 'id' | 'portId'> | Ship>({
    name: '', imo: '', type: '', length: 0, draft: 0, flag: '',
    eta: new Date().toISOString().substring(0, 16),
    etd: new Date().toISOString().substring(0, 16),
    status: ShipStatus.APPROACHING, berthIds: [], departureDate: undefined,
    pilotId: undefined, agentId: undefined, hasDangerousGoods: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [primaryBerthId, setPrimaryBerthId] = useState<string>('');
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>({ isValid: true, message: '', berthIds: [] });

  const otherShips = useMemo(() => ships.filter(s => s.id !== shipToEdit?.id), [ships, shipToEdit]);
  const canAssignPersonnel = useMemo(() => [UserRole.ADMIN, UserRole.OPERATOR].includes(currentUser.role), [currentUser]);

  const checkBerthAssignment = useCallback((shipLength: number, shipDraft: number, selectedBerthId: string): AssignmentStatus => {
    if (!selectedBerthId) return { isValid: true, message: '', berthIds: [] };
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
    if (shipToEdit) {
      setFormData({
        ...shipToEdit,
        hasDangerousGoods: shipToEdit.hasDangerousGoods || false,
        eta: new Date(shipToEdit.eta).toISOString().substring(0, 16),
        etd: new Date(shipToEdit.etd).toISOString().substring(0, 16),
      });
      setPrimaryBerthId(shipToEdit.berthIds[0] || '');
    } else {
        setFormData({
            name: '', imo: '', type: '', length: 0, draft: 0, flag: '',
            eta: new Date().toISOString().substring(0, 16),
            etd: new Date().toISOString().substring(0, 16),
            status: ShipStatus.APPROACHING, berthIds: [], departureDate: undefined,
            pilotId: undefined, agentId: undefined, hasDangerousGoods: false,
        });
        setPrimaryBerthId('');
    }
  }, [shipToEdit]);

  useEffect(() => {
    const status = checkBerthAssignment(formData.length, formData.draft, primaryBerthId);
    setAssignmentStatus(status);
    setFormData(prev => ({...prev, berthIds: status.berthIds }));
  }, [primaryBerthId, formData.length, formData.draft, checkBerthAssignment]);

  useEffect(() => {
    const isDepartingOrLeft = formData.status === ShipStatus.DEPARTING || formData.status === ShipStatus.LEFT_PORT;
    if (isDepartingOrLeft && primaryBerthId !== '') setPrimaryBerthId('');
    setFormData(prev => {
      let newDepartureDate = prev.departureDate;
      let needsUpdate = false;
      if (formData.status === ShipStatus.LEFT_PORT) {
        if (!prev.departureDate) {
          newDepartureDate = shipToEdit?.departureDate || new Date().toISOString();
          needsUpdate = true;
        }
      } else {
        if (prev.departureDate) {
          newDepartureDate = undefined;
          needsUpdate = true;
        }
      }
      if (needsUpdate) return { ...prev, departureDate: newDepartureDate };
      return prev;
    });
  }, [formData.status, primaryBerthId, shipToEdit]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Ship name is required.';
    if (!/^\d{7}$/.test(formData.imo)) newErrors.imo = 'IMO must be a 7-digit number.';
    if (formData.type.trim() && !/^[a-zA-Z0-9\s]+$/.test(formData.type)) newErrors.type = 'Ship type can only contain letters, numbers, and spaces.';
    if (formData.length <= 0) newErrors.length = 'Length must be a positive number.';
    if (formData.draft <= 0) newErrors.draft = 'Draft must be a positive number.';
    if (formData.status === ShipStatus.DOCKED && formData.berthIds.length === 0) newErrors.berthIds = 'A ship with status "Docked" must be assigned to a berth.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const isChecked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: isChecked }));
        if (name === 'hasDangerousGoods' && isChecked) playNotificationSound();
    } else {
        setFormData(prev => ({ ...prev, [name]: name === 'length' || name === 'draft' ? parseFloat(value) || 0 : value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'status' && errors.berthIds) setErrors(prev => ({...prev, berthIds: ''}));
  };
  
  const handleBerthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPrimaryBerthId(e.target.value);
      if (errors.berthIds) setErrors(prev => ({...prev, berthIds: ''}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate() && assignmentStatus.isValid) {
      const shipToSave = {
        ...formData,
        eta: new Date(formData.eta).toISOString(),
        etd: new Date(formData.etd).toISOString(),
        pilotId: formData.pilotId || undefined,
        agentId: formData.agentId || undefined,
      };
      
      const saveAction = 'id' in shipToSave
        ? updateShip(shipToSave.id, shipToSave as Ship)
        : addShip({ ...shipToSave, portId: ships[0].portId } as Omit<Ship, 'id'>);
      
      saveAction.then(closeShipFormModal);
    }
  };
  
  const getBerthSelectClasses = () => {
    const base = "mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 disabled:bg-gray-600 disabled:cursor-not-allowed";
    if (!primaryBerthId) return `${base} border-gray-600 focus:ring-cyan-500`;
    if (!assignmentStatus.isValid) return `${base} border-red-500 focus:ring-red-500`;
    if (assignmentStatus.berthIds.length > 1) return `${base} border-blue-500 focus:ring-blue-500`;
    return `${base} border-green-500 focus:ring-green-500`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">{shipToEdit ? 'Edit Ship' : 'Add New Ship'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Ship Name" name="name" type="text" value={formData.name} onChange={handleChange} error={errors.name} />
            <InputField label="IMO Number" name="imo" type="text" value={formData.imo} onChange={handleChange} error={errors.imo} />
            {shipToEdit?.currentTripId && (
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Current Stopover ID</label>
                    <input type="text" disabled value={shipToEdit.currentTripId} className="mt-1 block w-full px-3 py-2 bg-gray-900/50 text-gray-400 border border-gray-600 rounded-md font-mono" />
                </div>
            )}
            <InputField label="Ship Type" name="type" type="text" value={formData.type} onChange={handleChange} error={errors.type} />
            <InputField label="Flag" name="flag" type="text" value={formData.flag} onChange={handleChange} error={errors.flag} />
            <InputField label="Length (m)" name="length" type="number" value={formData.length} onChange={handleChange} error={errors.length} />
            <InputField label="Draft (m)" name="draft" type="number" value={formData.draft} onChange={handleChange} error={errors.draft} />
             <div>
              <label htmlFor="eta" className="block text-sm font-medium text-gray-300">ETA</label>
              <input type="datetime-local" id="eta" name="eta" value={formData.eta} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label htmlFor="etd" className="block text-sm font-medium text-gray-300">ETD</label>
              <input type="datetime-local" id="etd" name="etd" value={formData.etd} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {Object.values(ShipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="berthId" className="block text-sm font-medium text-gray-300">Assigned Berth</label>
                <select id="berthId" name="berthId" value={primaryBerthId} onChange={handleBerthChange} className={getBerthSelectClasses()} disabled={formData.status === ShipStatus.DEPARTING || formData.status === ShipStatus.LEFT_PORT}>
                    <option value="">-- Unassigned --</option>
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
                {errors.berthIds && <p className="text-red-500 text-xs mt-1">{errors.berthIds}</p>}
            </div>
            {canAssignPersonnel && (
              <>
                <div>
                  <label htmlFor="agentId" className="block text-sm font-medium text-gray-300">Maritime Agent</label>
                  <select id="agentId" name="agentId" value={formData.agentId || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="">-- No Agent --</option>
                      {agents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="pilotId" className="block text-sm font-medium text-gray-300">Assigned Pilot</label>
                  <select id="pilotId" name="pilotId" value={formData.pilotId || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="">-- No Pilot --</option>
                      {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className={`md:col-span-2 p-2 rounded-md transition-all duration-300 ${formData.hasDangerousGoods ? 'bg-red-900/40 ring-2 ring-red-600/70 animate-pulse' : ''}`}>
                <div className="flex items-center">
                    <input id="hasDangerousGoods" name="hasDangerousGoods" type="checkbox" checked={formData.hasDangerousGoods} onChange={handleChange} className="h-5 w-5 text-red-600 bg-gray-900 border-gray-600 rounded focus:ring-red-500" />
                    <label htmlFor="hasDangerousGoods" className="ml-3 block text-md font-medium text-red-400">Carrying Dangerous Goods</label>
                </div>
                 {formData.hasDangerousGoods && ( <p className="text-red-400 text-xs mt-2 ml-8">WARNING: Special handling procedures may be required.</p> )}
            </div>
          </div>
           {formData.status === ShipStatus.LEFT_PORT && formData.departureDate && (
             <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300">Departure Date (Auto-set)</label>
                <input type="text" disabled value={new Date(formData.departureDate).toLocaleString()} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-gray-400 border border-gray-600 rounded-md" />
            </div>
           )}

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={closeShipFormModal} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!assignmentStatus.isValid}>Save Ship</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipFormModal;