import React, { useState, useMemo } from 'react';
import type { Trip } from '../types';
import { TripStatus, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import PDFIcon from '../components/icons/PDFIcon';
import { formatDuration } from '../utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePort } from '../context/PortContext';
import { DEFAULT_APP_LOGO_PNG } from '../utils/logo';

const statusColors: { [key in TripStatus]: string } = {
  [TripStatus.ACTIVE]: 'bg-green-500/20 text-green-300 border-green-500',
  [TripStatus.COMPLETED]: 'bg-gray-600/20 text-gray-400 border-gray-600',
};

const TripDirectory: React.FC = () => {
  const { state, actions } = usePort();
  const { trips, selectedPort } = state;
  const { currentUser, users } = useAuth();
  
  const [filter, setFilter] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
  const canExport = useMemo(() => currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.CAPTAIN, [currentUser]);

  const filteredTrips = useMemo(() => {
    return trips
      .filter(trip => showCompleted || trip.status !== TripStatus.COMPLETED)
      .filter(trip => 
        trip.vesselName?.toLowerCase().includes(filter.toLowerCase()) || 
        trip.vesselImo?.includes(filter) ||
        trip.id.toLowerCase().includes(filter.toLowerCase())
      );
  }, [trips, filter, showCompleted]);

  const { items: sortedTrips, requestSort, sortConfig } = useSortableData<Trip>(filteredTrips, { key: 'arrivalTimestamp', direction: 'descending' });
  const getSortDirectionFor = (key: keyof Trip) => sortConfig?.key === key ? sortConfig.direction : undefined;
  
  const handleExportCSV = () => {
    if (!selectedPort) return;
    const dataToExport = sortedTrips.map(trip => ({
      'Trip ID': trip.id, 'Vessel Name': trip.vesselName, 'IMO': trip.vesselImo, 'Status': trip.status,
      'Arrival': new Date(trip.arrivalTimestamp).toLocaleString(),
      'Departure': trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : 'Active',
      'Duration': trip.departureTimestamp ? formatDuration(new Date(trip.departureTimestamp).getTime() - new Date(trip.arrivalTimestamp).getTime()) : 'Active',
      'Agent': trip.agentId ? userMap.get(trip.agentId) || 'Unknown' : 'N/A',
      'Pilot': trip.pilotId ? userMap.get(trip.pilotId) || 'Unknown' : 'N/A',
    }));
    downloadCSV(dataToExport, `trip_directory_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPDF = () => {
    if (!selectedPort) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumns = ["Trip ID", "Vessel Name (IMO)", "Status", "Arrival", "Departure", "Duration", "Agent", "Pilot"];
    const tableRows = sortedTrips.map(trip => [
        trip.id.split('-')[1], `${trip.vesselName} (${trip.vesselImo})`, trip.status,
        new Date(trip.arrivalTimestamp).toLocaleString(),
        trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : '—',
        trip.departureTimestamp ? formatDuration(new Date(trip.departureTimestamp).getTime() - new Date(trip.arrivalTimestamp).getTime()) : 'Active',
        trip.agentId ? userMap.get(trip.agentId) || 'Unknown' : 'N/A',
        trip.pilotId ? userMap.get(trip.pilotId) || 'Unknown' : 'N/A',
    ]);
    
    autoTable(doc, {
        head: [tableColumns], body: tableRows, theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { fontStyle: 'bold' } },
        didDrawPage: (data: any) => {
            doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
            let titleX = data.settings.margin.left;
            const marginLeft = data.settings.margin.left;
            
            const getMimeType = (dataUrl: string) => {
                const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,/);
                return match ? match[1].toUpperCase() : null;
            };

            const customLogo = selectedPort.logoImage;
            const customLogoFormat = customLogo ? getMimeType(customLogo) : null;
            const isCustomLogoValid = customLogo && customLogoFormat && ['PNG', 'JPEG', 'WEBP'].includes(customLogoFormat);

            let logoAdded = false;

            // Attempt 1: Add custom logo if valid
            if (isCustomLogoValid) {
                try {
                    doc.addImage(customLogo!, customLogoFormat!, marginLeft, 15, 20, 20);
                    logoAdded = true;
                } catch (e) {
                    console.warn('Failed to add custom port logo, it might be corrupt. Falling back.', e);
                }
            }

            // Attempt 2: Add default logo if custom one wasn't added
            if (!logoAdded) {
                try {
                    doc.addImage(DEFAULT_APP_LOGO_PNG, 'PNG', marginLeft, 15, 20, 20);
                    logoAdded = true;
                } catch (e) {
                    console.error('CRITICAL: Failed to add default logo. Proceeding without one.', e);
                }
            }
            
            if (logoAdded) {
                titleX += 22;
            }

            doc.text("Trip Directory", titleX, 22);
            doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(selectedPort.name, titleX, 29);
            doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - data.settings.margin.right, 29, { align: 'right' });
            doc.text(`Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
        },
        margin: { top: 38 }
    });
    doc.save(`trip_directory_${selectedPort.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">Trip Directory</h1>
        {canExport && (
            <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={handleExportPDF} className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm flex items-center gap-2"><PDFIcon className="w-4 h-4" /> Export PDF</button>
                <button onClick={handleExportCSV} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>
            </div>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input type="text" placeholder="Filter by vessel, IMO, or Trip ID..." value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        <label className="flex items-center text-sm text-gray-300 whitespace-nowrap"><input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded" /><span className="ml-2">Show completed trips</span></label>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
            <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                <tr>
                    {['id', 'vesselName', 'status', 'arrivalTimestamp', 'departureTimestamp'].map(key => (
                       <th className="px-4 py-3" key={key}><button onClick={() => requestSort(key as keyof Trip)} className="flex items-center gap-1 hover:text-white capitalize">{key.replace('vesselName', 'Vessel').replace('Timestamp', '')} <SortIcon direction={getSortDirectionFor(key as keyof Trip)} /></button></th>
                    ))}
                    <th className="px-4 py-3">Duration</th>
                    {['agentId', 'pilotId'].map(key => (
                       <th className="px-4 py-3" key={key}><button onClick={() => requestSort(key as keyof Trip)} className="flex items-center gap-1 hover:text-white capitalize">{key.replace('Id', '')} <SortIcon direction={getSortDirectionFor(key as keyof Trip)} /></button></th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {sortedTrips.map(trip => (
                    <tr key={trip.id} onClick={() => actions.openModal({ type: 'tripDetail', trip })} className="group transition-colors duration-200 cursor-pointer hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{trip.id.split('-')[1]}</td>
                        <td className="px-4 py-3 font-medium text-white">{trip.vesselName} <span className="text-gray-500">({trip.vesselImo})</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[trip.status]}`}>{trip.status}</span></td>
                        <td className="px-4 py-3">{new Date(trip.arrivalTimestamp).toLocaleString()}</td>
                        <td className="px-4 py-3">{trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : '—'}</td>
                        <td className="px-4 py-3">{trip.departureTimestamp ? formatDuration(new Date(trip.departureTimestamp).getTime() - new Date(trip.arrivalTimestamp).getTime()) : formatDuration(Date.now() - new Date(trip.arrivalTimestamp).getTime())}</td>
                        <td className="px-4 py-3">{trip.agentId ? userMap.get(trip.agentId) || 'Unknown' : '—'}</td>
                        <td className="px-4 py-3">{trip.pilotId ? userMap.get(trip.pilotId) || 'Unknown' : '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default TripDirectory;