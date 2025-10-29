import React, { useState, useMemo } from 'react';
import { usePort } from '../context/PortContext';
import { useSortableData } from '../hooks/useSortableData';
import type { ShipMovement } from '../types';
import SortIcon from '../components/icons/SortIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import PDFIcon from '../components/icons/PDFIcon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadCSV } from '../utils/export';
import addHeaderWithLogo from '../utils/pdfUtils';
import { toast } from 'react-hot-toast';

const LOGS_PER_PAGE = 50;

const VesselMovements: React.FC = () => {
    const { state } = usePort();
    const { movements, ships, selectedPort } = state;

    const [textFilter, setTextFilter] = useState('');
    const [vesselFilter, setVesselFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const shipMap = useMemo(() => new Map(ships.map(s => [s.id, { name: s.name, imo: s.imo }])), [ships]);
    const uniqueVessels = useMemo(() => [...ships].sort((a, b) => a.name.localeCompare(b.name)), [ships]);

    const filteredMovements = useMemo(() => {
        setCurrentPage(1); // Reset page on filter change

        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() + 86400000 - 1 : Infinity; // Include the whole end day

        return movements.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            if (logTime < start || logTime > end) return false;

            if (vesselFilter !== 'all' && log.shipId !== vesselFilter) return false;

            if (!textFilter) return true;
            
            const lowerCaseFilter = textFilter.toLowerCase();
            const vesselInfo = shipMap.get(log.shipId);
            
            return (
                (vesselInfo?.name.toLowerCase().includes(lowerCaseFilter)) ||
                log.eventType.toLowerCase().includes(lowerCaseFilter) ||
                log.details.message.toLowerCase().includes(lowerCaseFilter) ||
                (log.tripId && log.tripId.toLowerCase().includes(lowerCaseFilter))
            );
        });
    }, [movements, textFilter, vesselFilter, startDate, endDate, shipMap]);

    const { items: sortedMovements, requestSort, sortConfig } = useSortableData<ShipMovement>(filteredMovements, { key: 'timestamp', direction: 'descending' });
    const getSortDirectionFor = (key: keyof ShipMovement) => sortConfig?.key === key ? sortConfig.direction : undefined;

    const totalPages = Math.ceil(sortedMovements.length / LOGS_PER_PAGE);
    const paginatedMovements = useMemo(() => {
        return sortedMovements.slice(
            (currentPage - 1) * LOGS_PER_PAGE,
            currentPage * LOGS_PER_PAGE
        );
    }, [sortedMovements, currentPage]);
    
    const handleResetFilters = () => {
        setTextFilter('');
        setVesselFilter('all');
        setStartDate('');
        setEndDate('');
        toast.success("Filters reset.");
    };

    const handleExportCSV = () => {
        if (!selectedPort || sortedMovements.length === 0) {
            toast.error("No data to export.");
            return;
        }
        const dataToExport = sortedMovements.map(log => {
            const vessel = shipMap.get(log.shipId);
            return {
                'Timestamp': new Date(log.timestamp).toLocaleString(),
                'Vessel Name': vessel?.name || 'N/A',
                'IMO': vessel?.imo || 'N/A',
                'Event Type': log.eventType,
                'Details': log.details.message,
                'Trip ID': log.tripId || 'N/A',
            };
        });
        downloadCSV(dataToExport, `vessel_movements_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
    };

    const handleExportPDF = () => {
        if (!selectedPort || sortedMovements.length === 0) {
            toast.error("No data to export.");
            return;
        }
        const doc = new jsPDF({ orientation: 'landscape' });
        const tableColumns = ['Timestamp', 'Vessel', 'IMO', 'Event', 'Trip ID', 'Details'];
        const tableRows = sortedMovements.map(log => {
            const vessel = shipMap.get(log.shipId);
            return [
                new Date(log.timestamp).toLocaleString(),
                vessel?.name || 'N/A',
                vessel?.imo || 'N/A',
                log.eventType,
                log.tripId ? log.tripId.split('-')[1] : '—',
                log.details.message,
            ];
        });
        
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 5: { cellWidth: 80 } },
            didDrawPage: (data: any) => {
                addHeaderWithLogo(doc, selectedPort, `Vessel Movement Log`);
                doc.setFontSize(10);
                doc.text(`Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
            },
            margin: { top: 38 }
        });
        doc.save(`vessel_movements_${selectedPort.name.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col" data-log-context="Vessel Movement Log">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h1 className="text-2xl font-bold text-white">Vessel Movement Log</h1>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={handleExportPDF} className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm flex items-center gap-2"><PDFIcon className="w-4 h-4" /> Export PDF</button>
                    <button onClick={handleExportCSV} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end">
                <div className="lg:col-span-2">
                    <label htmlFor="vessel-filter" className="block text-xs font-medium text-gray-400 mb-1">Filter by Vessel</label>
                    <select id="vessel-filter" value={vesselFilter} onChange={e => setVesselFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option value="all">All Vessels</option>
                        {uniqueVessels.map(ship => <option key={ship.id} value={ship.id}>{ship.name} ({ship.imo})</option>)}
                    </select>
                </div>
                 <div className="lg:col-span-2">
                    <label htmlFor="text-filter" className="block text-xs font-medium text-gray-400 mb-1">Filter by Keyword</label>
                    <input id="text-filter" type="text" placeholder="Filter details, event type..." value={textFilter} onChange={(e) => setTextFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <button onClick={handleResetFilters} className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 text-sm whitespace-nowrap lg:col-start-5">Reset Filters</button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end">
                <div className="lg:col-span-2">
                    <label htmlFor="start-date" className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                    <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div className="lg:col-span-2">
                    <label htmlFor="end-date" className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                    <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                        <tr>
                            <th className="px-4 py-3"><button onClick={() => requestSort('timestamp')} className="flex items-center gap-1 hover:text-white">Timestamp <SortIcon direction={getSortDirectionFor('timestamp')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('shipId')} className="flex items-center gap-1 hover:text-white">Vessel <SortIcon direction={getSortDirectionFor('shipId')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('eventType')} className="flex items-center gap-1 hover:text-white">Event <SortIcon direction={getSortDirectionFor('eventType')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('tripId')} className="flex items-center gap-1 hover:text-white">Trip ID <SortIcon direction={getSortDirectionFor('tripId')} /></button></th>
                            <th className="px-4 py-3">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedMovements.map(log => (
                            <tr key={log.id} className="hover:bg-gray-800/50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-4 py-3 font-medium text-white">{shipMap.get(log.shipId)?.name || 'N/A'}</td>
                                <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 whitespace-nowrap">{log.eventType}</span></td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.tripId ? log.tripId.split('-')[1] : '—'}</td>
                                <td className="px-4 py-3">{log.details.message}</td>
                            </tr>
                        ))}
                         {sortedMovements.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No movements match filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 text-sm text-gray-300 flex-shrink-0">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        &larr; Previous
                    </button>
                    <span>Page {currentPage} of {totalPages} ({sortedMovements.length} total entries)</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        Next &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default VesselMovements;
