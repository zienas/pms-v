
import React, { useState, useMemo } from 'react';
import type { Ship, Berth, Port } from '../types';
import { ShipStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/SortIcon';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import FireIcon from '../components/icons/FlameIcon';
import ClockIcon from '../components/icons/ClockIcon';
import ReassignIcon from '../components/icons/ReassignIcon';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import PDFIcon from '../components/icons/PDFIcon';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { usePort } from '../context/PortContext';


interface VesselDirectoryProps {
  selectedPort: Port | null;
}

const statusColors: { [key in ShipStatus]: string } = {
  [ShipStatus.APPROACHING]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500',
  [ShipStatus.DOCKED]: 'bg-green-500/20 text-green-300 border-green-500',
  [ShipStatus.DEPARTING]: 'bg-blue-500/20 text-blue-300 border-blue-500',
  [ShipStatus.ANCHORED]: 'bg-gray-500/20 text-gray-300 border-gray-500',
  [ShipStatus.LEFT_PORT]: 'bg-gray-600/20 text-gray-400 border-gray-600',
};

const VesselDirectory: React.FC<VesselDirectoryProps> = ({ selectedPort }) => {
  const [filter, setFilter] = useState('');
  const [showDeparted, setShowDeparted] = useState(false);
  const { currentUser, users } = useAuth();
  
  const { ships, berths, openShipFormModal, deleteShip, openHistoryModal } = usePort();

  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
  const berthMap = useMemo(() => new Map(berths.map(b => [b.id, b.name])), [berths]);

  const canModify = useMemo(() => {
    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR;
  }, [currentUser.role]);
  
  const canExport = useMemo(() => {
    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CAPTAIN;
  }, [currentUser.role]);

  const filteredShips = useMemo(() => {
    return ships
      .filter(ship => showDeparted || ship.status !== ShipStatus.LEFT_PORT)
      .filter(ship => 
        ship.name.toLowerCase().includes(filter.toLowerCase()) || 
        ship.imo.includes(filter) ||
        ship.type.toLowerCase().includes(filter.toLowerCase())
      );
  }, [ships, filter, showDeparted]);

  const { items: sortedShips, requestSort, sortConfig } = useSortableData<Ship>(filteredShips, { key: 'name', direction: 'ascending' });

  const getSortDirectionFor = (key: keyof Ship) => {
    if (!sortConfig) return undefined;
    return sortConfig.key === key ? sortConfig.direction : undefined;
  };
  
  const handleExportCSV = () => {
    const portName = selectedPort?.name || 'export';
    const dataToExport = sortedShips.map(ship => ({
      'Name': ship.name,
      'IMO': ship.imo,
      'Trip ID': ship.currentTripId || '',
      'Type': ship.type,
      'Dangerous Goods': ship.hasDangerousGoods ? 'YES' : 'NO',
      'Length (m)': ship.length,
      'Draft (m)': ship.draft,
      'Flag': ship.flag,
      'Status': ship.status,
      'ETA': ship.eta && !isNaN(new Date(ship.eta).getTime()) ? new Date(ship.eta).toLocaleString() : 'Invalid Date',
      'ETD': ship.etd && !isNaN(new Date(ship.etd).getTime()) ? new Date(ship.etd).toLocaleString() : 'Invalid Date',
      'Assigned Berths': ship.berthIds.map(id => berthMap.get(id)).join(', ') || 'Unassigned',
      'Assigned Pilot': ship.pilotId ? userMap.get(ship.pilotId) || 'Unknown' : 'N/A',
      'Departure Date': ship.departureDate && !isNaN(new Date(ship.departureDate).getTime()) ? new Date(ship.departureDate).toLocaleString() : '',
    }));
    downloadCSV(dataToExport, `vessel_directory_${portName.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPDF = () => {
    if (!selectedPort) {
        alert("Please select a port first.");
        return;
    }
    const doc = new jsPDF();
    const tableColumns = ["Name", "IMO", "Trip ID", "Type", "Status", "Assigned Berths", "Assigned Pilot"];
    const tableRows = sortedShips.map(ship => [
        ship.name,
        ship.imo,
        ship.currentTripId ? ship.currentTripId.split('-')[1] : '—',
        ship.type,
        ship.status,
        ship.berthIds.map(id => berthMap.get(id)).join(', ') || 'Unassigned',
        ship.pilotId ? userMap.get(ship.pilotId) || 'Unknown' : 'N/A',
    ]);
    
    const portName = selectedPort.name;
    const hasLogo = selectedPort.logoImage;

    (doc as any).autoTable({
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        styles: { 
            fontSize: 8,
            cellPadding: 2,
        },
        headStyles: { 
            fillColor: [41, 128, 185], // Professional blue
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { fontStyle: 'bold' } // Bold vessel name
        },
        didDrawPage: (data: any) => {
            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40);

            let titleX = data.settings.margin.left;
            if (hasLogo) {
                try {
                    doc.addImage(selectedPort.logoImage!, 'PNG', data.settings.margin.left, 15, 20, 20);
                    titleX += 22; // Indent title if logo is present
                } catch(e) {
                    console.error("Error adding logo to PDF:", e);
                }
            }
            doc.text("Vessel Directory", titleX, 22);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(portName, titleX, 29);

            const generatedDate = `Generated: ${new Date().toLocaleString()}`;
            doc.setFontSize(10);
            doc.text(generatedDate, doc.internal.pageSize.getWidth() - data.settings.margin.right, 29, { align: 'right' });

            // Footer
            // FIX: Changed doc.internal.getNumberOfPages() to doc.getNumberOfPages() which is the correct modern API for jsPDF.
            const pageStr = `Page ${doc.getNumberOfPages()}`;
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(pageStr, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
        },
        margin: { top: 38 }
    });

    doc.save(`vessel_directory_${portName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Vessel Directory</h1>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {canExport && (
                 <>
                    <button
                        onClick={handleExportPDF}
                        className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm flex items-center gap-2"
                    >
                        <PDFIcon className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export CSV
                    </button>
                 </>
            )}
            {canModify && (
              <button
                onClick={() => openShipFormModal(null)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
              >
                Add Ship
              </button>
            )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by name, IMO, or type..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <label className="flex items-center text-sm text-gray-300 whitespace-nowrap">
          <input
            type="checkbox"
            checked={showDeparted}
            onChange={(e) => setShowDeparted(e.target.checked)}
            className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
          />
          <span className="ml-2">Show departed vessels</span>
        </label>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                <tr>
                    <th className="px-4 py-3">
                        <button onClick={() => requestSort('name')} className="flex items-center gap-1 hover:text-white">
                            Name <SortIcon direction={getSortDirectionFor('name')} />
                        </button>
                    </th>
                    <th className="px-4 py-3">
                        <button onClick={() => requestSort('imo')} className="flex items-center gap-1 hover:text-white">
                            IMO <SortIcon direction={getSortDirectionFor('imo')} />
                        </button>
                    </th>
                    <th className="px-4 py-3">
                        <button onClick={() => requestSort('currentTripId')} className="flex items-center gap-1 hover:text-white">
                            Trip ID <SortIcon direction={getSortDirectionFor('currentTripId')} />
                        </button>
                    </th>
                    <th className="px-4 py-3">
                        <button onClick={() => requestSort('type')} className="flex items-center gap-1 hover:text-white">
                            Type <SortIcon direction={getSortDirectionFor('type')} />
                        </button>
                    </th>
                     <th className="px-4 py-3">
                        <button onClick={() => requestSort('pilotId')} className="flex items-center gap-1 hover:text-white">
                            Assigned Pilot <SortIcon direction={getSortDirectionFor('pilotId')} />
                        </button>
                    </th>
                    <th className="px-4 py-3">
                         <button onClick={() => requestSort('status')} className="flex items-center gap-1 hover:text-white">
                            Status <SortIcon direction={getSortDirectionFor('status')} />
                        </button>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {sortedShips.map(ship => (
                    <tr key={ship.id} className={`group transition-colors duration-200 ${ship.status === ShipStatus.LEFT_PORT ? 'bg-gray-800/60' : ''} ${ship.hasDangerousGoods ? 'bg-red-900/20 hover:bg-red-900/30' : 'hover:bg-gray-800/50'}`}>
                        <td className="px-4 py-3 font-medium text-white">
                            <div className="flex items-center gap-2">
                                {ship.hasDangerousGoods && (
                                    <div className="relative flex-shrink-0" title="Carrying Dangerous Goods">
                                        <FireIcon className="w-4 h-4 text-red-400" />
                                        <div className="absolute top-0 left-0 w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                                    </div>
                                )}
                                <span>{ship.name}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3">{ship.imo}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                            {ship.currentTripId && typeof ship.currentTripId === 'string' && ship.currentTripId.includes('-') 
                                ? ship.currentTripId.split('-')[1] 
                                : '—'}
                        </td>
                        <td className="px-4 py-3">{ship.type}</td>
                        <td className="px-4 py-3">{ship.pilotId ? userMap.get(ship.pilotId) || 'Unknown Pilot' : '—'}</td>
                        <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[ship.status]}`}>{ship.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openHistoryModal(ship)} className="p-1 text-gray-300 hover:text-blue-400" title="View history" aria-label={`View history for ${ship.name}`}>
                                   <ClockIcon className="h-5 w-5" />
                                </button>
                                {canModify && (
                                    <>
                                        <button onClick={() => openShipFormModal(ship)} className="p-1 text-gray-300 hover:text-green-400" title="Change berth" aria-label={`Change berth for ${ship.name}`}>
                                            <ReassignIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => openShipFormModal(ship)} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit ship" aria-label={`Edit ${ship.name}`}>
                                          <EditIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => deleteShip(ship.portId, ship.id)} className="p-1 text-gray-300 hover:text-red-500" title="Delete ship" aria-label={`Delete ${ship.name}`}>
                                          <DeleteIcon className="h-5 w-5" />
                                        </button>
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
