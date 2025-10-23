import React, { useState, useMemo } from 'react';
import { usePort } from '../context/PortContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PDFIcon from '../components/icons/PDFIcon';
import addHeaderWithLogo from '../utils/pdfUtils';
import { formatDuration } from '../utils/formatters';
import { MovementEventType, ShipMovement, LoginHistoryEntry, InteractionLogEntry } from '../types';

interface UnifiedLog {
    id: string;
    timestamp: string;
    eventType: string;
    subjectName: string;
    details: string;
    tripId?: string;
    imo?: string;
    action?: string;
    value?: any;
}

type LogTab = 'all' | 'vessel' | 'action' | 'user' | 'interaction';

const SystemLogs: React.FC = () => {
    const { state } = usePort();
    const { movements, ships, selectedPort, loginHistory, interactionLogs } = state;
    
    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<LogTab>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const LOGS_PER_PAGE = 50;

    const shipMap = useMemo(() => new Map(ships.map(s => [s.id, s])), [ships]);

    const displayedLogs = useMemo(() => {
        const processMovements = (movs: ShipMovement[]): UnifiedLog[] => movs.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            eventType: log.eventType,
            subjectName: shipMap.get(log.shipId)?.name || 'Unknown Vessel',
            details: log.details.message,
            tripId: log.tripId,
            imo: shipMap.get(log.shipId)?.imo,
        }));

        const processLogins = (hist: LoginHistoryEntry[]): UnifiedLog[] => hist.flatMap(log => {
            const entries: UnifiedLog[] = [{
                id: `login-${log.id}`,
                timestamp: log.timestamp,
                eventType: 'User Login',
                subjectName: log.userName,
                details: `Logged into port '${log.portName}'.`,
            }];
            if (log.logoutTimestamp) {
                entries.push({
                    id: `logout-${log.id}`,
                    timestamp: log.logoutTimestamp,
                    eventType: 'User Logout',
                    subjectName: log.userName,
                    details: `Session duration: ${formatDuration(new Date(log.logoutTimestamp).getTime() - new Date(log.timestamp).getTime())}`,
                });
            }
            return entries;
        });

        const processInteractions = (interactions: InteractionLogEntry[]): UnifiedLog[] => interactions.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            eventType: log.eventType,
            subjectName: log.userName,
            details: `[${log.details.view || 'Global'}] ${log.details.message}`,
            action: log.details.action,
            value: log.details.value,
        }));


        switch (activeTab) {
            case 'vessel':
                return processMovements(movements);
            case 'action':
                const actionTypes: string[] = [
                    MovementEventType.BERTH_ASSIGNMENT,
                    MovementEventType.PILOT_ASSIGNMENT,
                    MovementEventType.AGENT_ASSIGNMENT,
                    MovementEventType.CREATED,
                ];
                return processMovements(movements.filter(log => actionTypes.includes(log.eventType)));
            case 'user':
                return processLogins(loginHistory);
            case 'interaction':
                return processInteractions(interactionLogs);
            case 'all':
            default:
                return [
                    ...processMovements(movements), 
                    ...processLogins(loginHistory),
                    ...processInteractions(interactionLogs),
                ];
        }
    }, [activeTab, movements, loginHistory, interactionLogs, shipMap]);

    const filteredLogs = useMemo(() => {
        setCurrentPage(1); // Reset to first page on filter change
        return displayedLogs.filter(log => {
            const lowerCaseFilter = filter.toLowerCase();
            return (
                log.subjectName.toLowerCase().includes(lowerCaseFilter) ||
                log.eventType.toLowerCase().includes(lowerCaseFilter) ||
                log.details.toLowerCase().includes(lowerCaseFilter) ||
                (log.tripId && log.tripId.toLowerCase().includes(lowerCaseFilter))
            );
        });
    }, [displayedLogs, filter]);

    const { items: sortedLogs, requestSort, sortConfig } = useSortableData<UnifiedLog>(filteredLogs, { key: 'timestamp', direction: 'descending' });
    const getSortDirectionFor = (key: keyof UnifiedLog) => sortConfig?.key === key ? sortConfig.direction : undefined;
    
    const totalPages = Math.ceil(sortedLogs.length / LOGS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        return sortedLogs.slice(
            (currentPage - 1) * LOGS_PER_PAGE,
            currentPage * LOGS_PER_PAGE
        );
    }, [sortedLogs, currentPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const tabs: { id: LogTab; label: string }[] = [
        { id: 'all', label: 'All Events' },
        { id: 'vessel', label: 'Vessel Movements' },
        { id: 'action', label: 'Port Actions' },
        { id: 'user', label: 'User Sessions' },
        { id: 'interaction', label: 'UI Interactions' },
    ];
    const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || 'System';

    const handleExportCSV = () => {
        if (!selectedPort) return;
        if (sortedLogs.length === 0) {
            toast.error('No log data to export.');
            return;
        }

        const dataToExport = sortedLogs.map(log => ({
            'Timestamp': new Date(log.timestamp).toLocaleString(),
            'Subject': log.subjectName,
            'Event Type': log.eventType,
            'Trip ID': activeTab !== 'user' ? log.tripId || 'N/A' : 'N/A',
            'Details': log.details,
        }));
        
        downloadCSV(dataToExport, `${currentTabLabel.replace(' ', '_').toLowerCase()}_logs_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
    };

    const handleExportPDF = () => {
        if (!selectedPort) return;
        if (sortedLogs.length === 0) {
            toast.error('No log data to export.');
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape' });
        const tableColumns = ['Timestamp', 'Subject', 'Event Type', 'Details'];
        if (activeTab !== 'user') {
            tableColumns.splice(3, 0, 'Trip ID');
        }

        const tableRows = sortedLogs.map(log => {
            const row = [
                new Date(log.timestamp).toLocaleString(),
                log.subjectName,
                log.eventType,
                log.details,
            ];
            if (activeTab !== 'user') {
                row.splice(3, 0, log.tripId ? log.tripId.split('-')[1] : '');
            }
            return row;
        });

        autoTable(doc, {
            head: [tableColumns], body: tableRows, theme: 'striped',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
            didDrawPage: (data: any) => {
                addHeaderWithLogo(doc, selectedPort, `${currentTabLabel} Logs`);
                doc.setFontSize(10);
                doc.text(`Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
            },
            margin: { top: 38 }
        });

        doc.save(`${currentTabLabel.replace(' ', '_').toLowerCase()}_logs_${selectedPort.name.replace(/\s+/g, '_')}.pdf`);
    };
    
    const PaginationControls: React.FC = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center mt-4 text-sm text-gray-300">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    &larr; Previous
                </button>
                <span>Page {currentPage} of {totalPages} ({sortedLogs.length} total entries)</span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next &rarr;
                </button>
            </div>
        );
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h1 className="text-2xl font-bold text-white">System Event Logs</h1>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={handleExportPDF} className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm flex items-center gap-2"><PDFIcon className="w-4 h-4" /> Export PDF</button>
                    <button onClick={handleExportCSV} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>
                </div>
            </div>
            
            <div className="border-b border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${tab.id === activeTab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex gap-4 mb-4">
                <input type="text" placeholder={`Filter ${currentTabLabel}...`} value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                        <tr>
                            <th className="px-4 py-3"><button onClick={() => requestSort('timestamp')} className="flex items-center gap-1 hover:text-white">Timestamp <SortIcon direction={getSortDirectionFor('timestamp')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('subjectName')} className="flex items-center gap-1 hover:text-white">Subject <SortIcon direction={getSortDirectionFor('subjectName')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('eventType')} className="flex items-center gap-1 hover:text-white">Event Type <SortIcon direction={getSortDirectionFor('eventType')} /></button></th>
                            {activeTab !== 'user' && activeTab !== 'interaction' && <th className="px-4 py-3"><button onClick={() => requestSort('tripId')} className="flex items-center gap-1 hover:text-white">Trip ID <SortIcon direction={getSortDirectionFor('tripId')} /></button></th>}
                            <th className="px-4 py-3">Details</th>
                            {activeTab === 'interaction' && <th className="px-4 py-3">Value</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-800/50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-4 py-3 font-medium text-white">{log.subjectName}</td>
                                <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">{log.eventType}</span></td>
                                {activeTab !== 'user' && activeTab !== 'interaction' && <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.tripId ? log.tripId.split('-')[1] : '—'}</td>}
                                <td className="px-4 py-3">{log.details}</td>
                                {activeTab === 'interaction' && <td className="px-4 py-3 text-cyan-300">{log.value !== undefined ? String(log.value) : ''}</td>}
                            </tr>
                        ))}
                        {sortedLogs.length === 0 && (
                            <tr><td colSpan={activeTab === 'all' ? 5 : 4} className="text-center py-8 text-gray-500">{displayedLogs.length === 0 ? "No log entries available." : "No logs match your filter."}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <PaginationControls />
        </div>
    );
};

export default SystemLogs;