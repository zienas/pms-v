import React, { useState, useMemo, useEffect } from 'react';
import type { Ship } from '../types';
import { ShipStatus, UserRole, InteractionEventType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import FireIcon from '../components/icons/FlameIcon';
import ClockIcon from '../components/icons/ClockIcon';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import PDFIcon from '../components/icons/PDFIcon';
import ReassignIcon from '../components/icons/ReassignIcon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePort } from '../context/PortContext';
import { toast } from 'react-hot-toast';
import addHeaderWithLogo from '../utils/pdfUtils';
import ShipIcon from '../components/icons/ShipIcon';
import TankerIcon from '../components/icons/TankerIcon';
import CargoShipIcon from '../components/icons/CargoShipIcon';
import { useLogger } from '../context/InteractionLoggerContext';

const SETTINGS_KEY = 'vesselDirectorySettings';

const loadSettings = () => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
};

const statusColors: { [key in ShipStatus]: string } = {
  [ShipStatus.APPROACHING]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500',
  [ShipStatus.DOCKED]: 'bg-green-500/20 text-green-300 border-green-500',
  [ShipStatus.DEPARTING]: 'bg-blue-500/20 text-blue-300 border-blue-500',
  [ShipStatus.ANCHORED]: 'bg-gray-500/20 text-gray-300 border-gray-500',
  [ShipStatus.LEFT_PORT]: 'bg-gray-600/20 text-gray-400 border-gray-600',
};

const getShipTypeIcon = (shipType: string): React.ElementType => {
    const lowerType = shipType.toLowerCase();
    if (lowerType.includes('tanker')) {
        return TankerIcon;
    }
    if (lowerType.includes('container')) {
        return ShipIcon;
    }
    if (lowerType.includes('cargo') || lowerType.includes('bulk')) {
        return CargoShipIcon;
    }
    return ShipIcon; // Default fallback
};

const VesselDirectory: React.FC = () => {
  const { state, actions } = usePort();
  const { ships, berths, selectedPort } = state;
  const { currentUser, users } = useAuth();
  const { log } = useLogger();

  const [settings, setSettings] = useState(() => loadSettings());
  const filter = settings.filter || '';
  const showDeparted = settings.showDeparted === undefined ? true : settings.showDeparted;
  const initialSortConfig = settings.sortConfig || { key: 'name', direction: 'ascending' };

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
  const berthMap = useMemo(() => new Map(berths.map(b => [b.id, b.name])), [berths]);

  const canModify = useMemo(() => !!currentUser && [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.OPERATOR].includes(currentUser.role), [currentUser]);
  const canExport = useMemo(() => !!currentUser && [UserRole.ADMIN, UserRole.SUPERVISOR].includes(currentUser.role), [currentUser]);

  const filteredShips = useMemo(() => {
    return ships
      .filter(ship => showDeparted || ship.status !== ShipStatus.LEFT_PORT)
      .filter(ship => 
        ship.name.toLowerCase().includes(filter.toLowerCase()) || 
        ship.imo.includes(filter) ||
        ship.type.toLowerCase().includes(filter.toLowerCase())
      );
  }, [ships, filter, showDeparted]);

  const { items: sortedShips, requestSort, sortConfig, setSortConfig } = useSortableData<Ship>(filteredShips, initialSortConfig);
  
  useEffect(() => {
    try {
        const newSettings = { filter, showDeparted, sortConfig };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
        console.warn("Could not save view settings:", error);
    }
  }, [filter, showDeparted, sortConfig]);

  const updateSetting = (key: string, value: any) => {
    if (key === 'filter') {
        log(InteractionEventType.FILTER_APPLIED, { action: 'Filter vessels', value });
    }
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    localStorage.removeItem(SETTINGS_KEY);
    setSettings({});
    setSortConfig({ key: 'name', direction: 'ascending' });
    toast.success('View settings have been reset.');
  };

  const getSortDirectionFor = (key: keyof Ship) => {
    if (!sortConfig) return undefined;
    return sortConfig.key === key ? sortConfig.direction : undefined;
  };
  
  const handleRequestSort = (key: keyof Ship) => {
    log(InteractionEventType.SORT_APPLIED, { action: 'Sort vessels', value: key });
    requestSort(key);
  };

  const handleExportCSV = () => {
    if (!selectedPort) return;
    log(InteractionEventType.DATA_EXPORT, { action: 'Export Vessel Directory to CSV' });
    const dataToExport = sortedShips.map(ship => ({
      'Name': ship.name, 'IMO': ship.imo, 'Trip ID': ship.currentTripId || '', 'Type': ship.type,
      'Dangerous Goods': ship.hasDangerousGoods ? 'YES' : 'NO', 'Length (m)': ship.length, 'Draft (m)': ship.draft,
      'Flag': ship.flag, 'Status': ship.status,
      'ETA': new Date(ship.eta).toLocaleString(), 'ETD': new Date(ship.etd).toLocaleString(),
      'Assigned Berths': ship.berthIds.map(id => berthMap.get(id)).join(', ') || 'Unassigned',
      'Assigned Pilot': ship.pilotId ? userMap.get(ship.pilotId) || 'Unknown' : 'N/A',
      'Departure Date': ship.departureDate ? new Date(ship.departureDate).toLocaleString() : '',
    }));
    downloadCSV(dataToExport, `vessel_directory_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPDF = () => {
    if (!selectedPort) return;
    log(InteractionEventType.DATA_EXPORT, { action: 'Export Vessel Directory to PDF' });
    const doc = new jsPDF();
    const tableColumns = ["Name", "IMO", "Trip ID", "Type", "Status", "Assigned Berths", "Pilot"];
    const tableRows = sortedShips.map(ship => [
        ship.name, ship.imo, ship.currentTripId ? ship.currentTripId.split('-')[1] : '—', ship.type, ship.status,
        ship.berthIds.map(id => berthMap.get(id)).join(', ') || 'Unassigned',
        ship.pilotId ? userMap.get(ship.pilotId) || 'Unknown' : 'N/A',
    ]);
    
    autoTable(doc, {
        head: [tableColumns], body: tableRows, theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didDrawPage: (data: any) => {
            addHeaderWithLogo(doc, selectedPort, "Vessel Directory");
            doc.setFontSize(10);
            doc.text(`Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
        },
        margin: { top: 38 }
    });
    doc.save(`vessel_directory_${selectedPort.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleActionClick = (type: 'history' | 'reassignBerth' | 'shipForm', ship: Ship) => {
    log(InteractionEventType.BUTTON_CLICK, {
        action: `Open modal: ${type}`,
        targetId: ship.id,
        value: ship.name,
    });
    actions.openModal({ type, ship } as any);
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Vessel Directory</h1>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {canExport && (
                 <>
                    <button onClick={handleExportPDF} className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm flex items-center gap-2"><PDFIcon className="w-4 h-4" /> Export PDF</button>
                    <button onClick={handleExportCSV} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>
                 </>
            )}
            {canModify && <button onClick={() => actions.openModal({ type: 'shipForm', ship: null })} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">Add Ship</button>}
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input type="text" placeholder="Filter by name, IMO, or type..." value={filter} onChange={(e) => updateSetting('filter', e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <div className="flex items-center gap-4">
            <label className="flex items-center text-sm text-gray-300 whitespace-nowrap">
              <input type="checkbox" checked={showDeparted} onChange={(e) => updateSetting('showDeparted', e.target.checked)} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
              <span className="ml-2">Show departed vessels</span>
            </label>
            <button onClick={handleClearFilters} className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 text-sm whitespace-nowrap">Reset View</button>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                <tr>
                    {['name', 'imo', 'currentTripId', 'type', 'pilotId', 'status'].map(key => (
                        <th className="px-4 py-3" key={key}>
                            <button onClick={() => handleRequestSort(key as keyof Ship)} className="flex items-center gap-1 hover:text-white capitalize">
                                {key.replace('currentTripId', 'Trip ID').replace('pilotId', 'Pilot')} <SortIcon direction={getSortDirectionFor(key as keyof Ship)} />
                            </button>
                        </th>
                    ))}
                    <th className="px-4 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {sortedShips.map(ship => (
                    <tr key={ship.id} className={`group transition-colors duration-200 ${ship.status === ShipStatus.LEFT_PORT ? 'bg-gray-800/60' : ''} ${ship.hasDangerousGoods ? 'bg-red-900/20 hover:bg-red-900/30' : 'hover:bg-gray-800/50'}`}>
                        <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const Icon = getShipTypeIcon(ship.type);
                                    return <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" title={ship.type} />;
                                })()}
                                {ship.hasDangerousGoods && <div className="flex-shrink-0" title="Carrying Dangerous Goods"><FireIcon className="w-4 h-4 text-red-400 animate-pulse" /></div>}
                                <span className={ship.hasDangerousGoods ? 'text-red-300' : 'text-white'}>{ship.name}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3">{ship.imo}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{ship.currentTripId?.split('-')[1] ?? '—'}</td>
                        <td className="px-4 py-3">{ship.type}</td>
                        <td className="px-4 py-3">{ship.pilotId ? userMap.get(ship.pilotId) || 'Unknown Pilot' : '—'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full border border-current ${Object.values(ShipStatus).includes(ship.status) ? statusColors[ship.status] : statusColors[ShipStatus.LEFT_PORT]}`}>{ship.status}</span></td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleActionClick('history', ship)} className="p-1 text-gray-300 hover:text-blue-400" title="View Movement History"><ClockIcon className="h-5 w-5" /></button>
                                {canModify && (
                                    <>
                                        <button onClick={() => handleActionClick('reassignBerth', ship)} className="p-1 text-gray-300 hover:text-green-400" title="Reassign Berth"><ReassignIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleActionClick('shipForm', ship)} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit ship"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => actions.deleteShip(ship.portId, ship.id)} className="p-1 text-gray-300 hover:text-red-500" title="Delete ship"><DeleteIcon className="h-5 w-5" /></button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default VesselDirectory;