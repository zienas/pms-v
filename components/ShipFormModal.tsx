import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Ship, Berth, User } from '../types';
import { ShipStatus, UserRole, InteractionEventType } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { useLogger } from '../context/InteractionLoggerContext';

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
  readOnly?: boolean;
  unit?: string;
}> = ({ label, name, type, value, error, onChange, readOnly = false, unit }) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="relative mt-1">
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          title={error} // Add title for tooltip on hover
          className={`block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${
            unit ? 'pr-10' : '' // Add padding for the unit
          } ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'
          } ${readOnly ? 'bg-gray-600 cursor-not-allowed' : ''}`}
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400 sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};


const ShipFormModal: React.FC = () => {
  const { currentUser, users } = useAuth();
  const { state, actions } = usePort();
  const { log } = useLogger();
  const { modal, berths, ships, selectedPortId } = state;
  const { addShip, updateShip, closeModal } = actions;
  const shipToEdit = useMemo(() => (modal?.type === 'shipForm' ? modal.ship : null), [modal]);

  const pilots = useMemo(() => users.filter(user => user.role === UserRole.PILOT), [users]);
  const agents = useMemo(() => users.filter(user => user.role === UserRole.AGENT), [users]);
  
  const isAgentMode = currentUser.role === UserRole.AGENT;

  const [formData, setFormData] = useState<Omit<Ship, 'id' | 'portId'> | Ship>({
    name: '', imo: '', callSign: '', type: '', length: 0, draft: 0, flag: '',
    eta: new Date().toISOString().substring(0, 16),
    etd: new Date().toISOString().substring(0, 16),
    status: ShipStatus.APPROACHING, berthIds: [], departureDate: undefined,
    pilotId: undefined, agentId: undefined, hasDangerousGoods: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [primaryBerthId, setPrimaryBerthId] = useState<string>('');
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>({ isValid: true, message: '', berthIds: [] });
  const [pilotSearch, setPilotSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');

  const otherShips = useMemo(() => ships.filter(s => s.id !== shipToEdit?.id), [ships, shipToEdit]);
  const canAssignPersonnel = useMemo(() => [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR].includes(currentUser.role), [currentUser]);

  const filteredPilots = useMemo(() =>
    pilots.filter(p =>
      p.name.toLowerCase().includes(pilotSearch.toLowerCase()) || p.id === formData.pilotId
    ), [pilots, pilotSearch, formData.pilotId]);

  const filteredAgents = useMemo(() =>
    agents.filter(a =>
      a.name.toLowerCase().includes(agentSearch.toLowerCase()) || a.id === formData.agentId
    ), [agents, agentSearch, formData.agentId]);

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
        callSign: shipToEdit.callSign || '',
        hasDangerousGoods: shipToEdit.hasDangerousGoods || false,
        eta: new Date(shipToEdit.eta).toISOString().substring(0, 16),
        etd: new Date(shipToEdit.etd).toISOString().substring(0, 16),
      });
      setPrimaryBerthId(shipToEdit.berthIds[0] || '');
    } else {
        setFormData({
            name: '', imo: '', callSign: '', type: '', length: 0, draft: 0, flag: '',
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
    
    // --- Enhanced IMO Validation ---
    if (!/^\d{7}$/.test(formData.imo)) {
        newErrors.imo = 'IMO must be a 7-digit number.';
    } else {
        const digits = formData.imo.split('').map(Number);
        const checkDigit = digits[6];
        // The check digit is the last digit of the sum of products of the first six digits.
        const sum = digits.slice(0, 6).reduce((acc, digit, index) => {
            return acc + (digit * (7 - index));
        }, 0);
        
        if (sum % 10 !== checkDigit) {
            newErrors.imo = 'Invalid IMO number (check digit mismatch).';
        }
    }

    if (formData.callSign && !/^[A-Z0-9]{3,7}$/.test(formData.callSign.toUpperCase())) newErrors.callSign = 'Invalid call sign format.';
    if (formData.type.trim() && !/^[a-zA-Z0-9\s-]+$/.test(formData.type)) newErrors.type = 'Ship type can only contain letters, numbers, spaces, and hyphens.';
    
    // Updated validation for length and draft
    if (formData.length <= 0) {
        newErrors.length = 'Length must be a positive number.';
    } else if (formData.length > 500) { // Reasonableness check
        newErrors.length = 'Length seems unreasonably large (max 500m).';
    }
    
    if (formData.draft <= 0) {
        newErrors.draft = 'Draft must be a positive number.';
    } else if (formData.draft > 40) { // Reasonableness check
        newErrors.draft = 'Draft seems unreasonably large (max 40m).';
    }
    
    if (formData.status === ShipStatus.DOCKED && formData.berthIds.length === 0) newErrors.berthIds = 'A ship with status "Docked" must be assigned to a berth.';

    // Date validation
    const etaDate = new Date(formData.eta);
    const etdDate = new Date(formData.etd);
    
    if (etaDate >= etdDate) {
        newErrors.eta = (newErrors.eta ? newErrors.eta + ' ' : '') + 'ETA must be before ETD.';
        newErrors.etd = (newErrors.etd ? newErrors.etd + ' ' : '') + 'ETD must be after ETA.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const isChecked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: isChecked }));
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

      log(InteractionEventType.FORM_SUBMIT, {
        action: 'id' in shipToSave ? 'Update Ship' : 'Add Ship',
        targetId: 'id' in shipToSave ? shipToSave.id : undefined,
        value: shipToSave.name,
      });
      
      const saveAction = 'id' in shipToSave
        ? updateShip(shipToSave.id, shipToSave as Ship)
        : addShip({ ...shipToSave, portId: selectedPortId! } as Omit<Ship, 'id'>);
      
      saveAction.then(closeModal);
    }
  };

  const handleCancel = () => {
    log(InteractionEventType.MODAL_CLOSE, {
      action: 'Cancel ShipForm',
      targetId: shipToEdit?.id,
    });
    closeModal();
  };
  
  const getBerthSelectClasses = () => {
    const base = "mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 disabled:bg-gray-600 disabled:cursor-not-allowed";
    if (!primaryBerthId) return `${base} border-gray-600 focus:ring-cyan-500`;
    if (!assignmentStatus.isValid) return `${base} border-red-500 focus:ring-red-500`;
    if (assignmentStatus.berthIds.length > 1) return `${base} border-blue-500 focus:ring-blue-500`;
    return `${base} border-green-500 focus:ring-green-500`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{shipToEdit ? 'Edit Ship' : 'Add New Ship'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Ship Name" name="name" type="text" value={formData.name} onChange={handleChange} error={errors.name} readOnly={isAgentMode} />
            <InputField label="IMO Number" name="imo" type="text" value={formData.imo} onChange={handleChange} error={errors.imo} readOnly={isAgentMode} />
            {shipToEdit?.currentTripId && (
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Current Stopover ID</label>
                    <input type="text" disabled value={shipToEdit.currentTripId} className="mt-1 block w-full px-3 py-2 bg-gray-900/50 text-gray-400 border border-gray-600 rounded-md font-mono" />
                </div>
            )}
            <InputField label="Call Sign" name="callSign" type="text" value={formData.callSign || ''} onChange={handleChange} error={errors.callSign} readOnly={isAgentMode} />
            <InputField label="Ship Type" name="type" type="text" value={formData.type} onChange={handleChange} error={errors.type} readOnly={isAgentMode} />
            <InputField label="Flag" name="flag" type="text" value={formData.flag} onChange={handleChange} error={errors.flag} readOnly={isAgentMode} />
            <InputField label="Length" name="length" type="number" value={formData.length} onChange={handleChange} error={errors.length} readOnly={isAgentMode} unit="m" />
            <InputField label="Draft" name="draft" type="number" value={formData.draft} onChange={handleChange} error={errors.draft} readOnly={isAgentMode} unit="m" />
            <div>
              <label htmlFor="eta" className="block text-sm font-medium text-gray-300">ETA</label>
              <input type="datetime-local" id="eta" name="eta" value={formData.eta} onChange={handleChange} readOnly={isAgentMode && !shipToEdit} className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${errors.eta ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'} ${isAgentMode && !shipToEdit ? 'bg-gray-600 cursor-not-allowed' : ''}`} />
              {errors.eta && <p className="text-red-500 text-xs mt-1">{errors.eta}</p>}
            </div>
            <div>
              <label htmlFor="etd" className="block text-sm font-medium text-gray-300">ETD</label>
              <input type="datetime-local" id="etd" name="etd" value={formData.etd} onChange={handleChange} readOnly={isAgentMode && !shipToEdit} className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${errors.etd ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'} ${isAgentMode && !shipToEdit ? 'bg-gray-600 cursor-not-allowed' : ''}`} />
              {errors.etd && <p className="text-red-500 text-xs mt-1">{errors.etd}</p>}
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} disabled={isAgentMode} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed">
                    {Object.values(ShipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="berthId" className="block text-sm font-medium text-gray-300">Assigned Berth</label>
                <select id="berthId" name="berthId" value={primaryBerthId} onChange={handleBerthChange} className={getBerthSelectClasses()} disabled={isAgentMode || formData.status === ShipStatus.DEPARTING || formData.status === ShipStatus.LEFT_PORT}>
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
                  <label htmlFor="agent-search" className="block text-sm font-medium text-gray-300">Maritime Agent</label>
                  <input
                    id="agent-search"
                    type="text"
                    placeholder="Search agents..."
                    value={agentSearch}
                    onChange={e => setAgentSearch(e.target.value)}
                    readOnly={isAgentMode}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 read-only:bg-gray-600 read-only:cursor-not-allowed"
                  />
                  <select id="agentId" name="agentId" value={formData.agentId || ''} onChange={handleChange} disabled={isAgentMode} className="mt-2 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed" aria-label="Filtered maritime agents">
                      <option value="">-- No Agent --</option>
                      {filteredAgents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="pilot-search" className="block text-sm font-medium text-gray-300">Assigned Pilot</label>
                  <input
                    id="pilot-search"
                    type="text"
                    placeholder="Search pilots..."
                    value={pilotSearch}
                    onChange={e => setPilotSearch(e.target.value)}
                    readOnly={isAgentMode}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 read-only:bg-gray-600 read-only:cursor-not-allowed"
                  />
                  <select id="pilotId" name="pilotId" value={formData.pilotId || ''} onChange={handleChange} disabled={isAgentMode} className="mt-2 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed" aria-label="Filtered assigned pilots">
                      <option value="">-- No Pilot --</option>
                      {filteredPilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className={`md:col-span-2 p-2 rounded-md transition-all duration-300 ${formData.hasDangerousGoods ? 'bg-red-900/40 ring-2 ring-red-600/70 animate-pulse' : ''}`}>
                <div className="flex items-center">
                    <input id="hasDangerousGoods" name="hasDangerousGoods" type="checkbox" checked={formData.hasDangerousGoods} onChange={handleChange} disabled={isAgentMode && !shipToEdit} className="h-5 w-5 text-red-600 bg-gray-900 border-gray-600 rounded focus:ring-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed" />
                    <label htmlFor="hasDangerousGoods" className="ml-3 block text-md font-medium text-red-400">Carrying Dangerous Goods</label>
                </div>
                 {formData.hasDangerousGoods && ( <p className="text-red-400 text-xs mt-2 ml-8">WARNING: Special handling procedures may be required.</p> )}
            </div>
          </div>
           {formData.status === ShipStatus.LEFT_PORT && formData.departureDate && (
             <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300">Departure Date (Auto-set)</label>
                <input type="text" disabled value={
                    formData.departureDate && !isNaN(new Date(formData.departureDate).getTime())
                    ? new Date(formData.departureDate).toLocaleString()
                    : 'Not yet departed'
                } className="mt-1 block w-full px-3 py-2 bg-gray-700 text-gray-400 border border-gray-600 rounded-md" />
            </div>
           )}

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleCancel} data-logging-handler="true" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" data-logging-handler="true" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!assignmentStatus.isValid}>Save Ship</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipFormModal;
