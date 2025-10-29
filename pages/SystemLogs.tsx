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
import { MovementEventType, ShipMovement, LoginHistoryEntry, InteractionLogEntry, ApiLogEntry } from '../types';

interface UnifiedLog {
    id: string;
    timestamp: string;
    eventType: string;
    subjectName: string;
    details: string;
    // Optional fields for different log types
    tripId?: string;
    imo?: string;
    action?: string;
    value?: any;
    method?: string;
    url?: string;
    statusCode?: number;
    durationMs?: number;
    userId?: string;
    userName?: string;
}

type LogTab = 'all' | 'vessel' | 'action' | 'user' | 'interaction' | 'api';
const LOGS_PER_PAGE = 50;

const SystemLogs: React.FC = () => {
    const { state } = usePort();
    const { movements, ships, selectedPort, loginHistory, interactionLogs, apiLogs } = state;
    
    const [filter, setFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState<LogTab>('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [statusCodeFilter, setStatusCodeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const shipMap = useMemo(() => new Map(ships.map(s => [s.id, s])), [ships]);
    const uniqueMethods = useMemo(() => ['all', ...Array.from(new Set(apiLogs.map(log => log.method)))], [apiLogs]);
    const uniqueStatusCodes = useMemo(() => ['all', ...Array.from(new Set(apiLogs.map(log => log.statusCode.toString())))].sort(), [apiLogs]);

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

        const processApiLogs = (logs: ApiLogEntry[]): UnifiedLog[] => logs.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            eventType: 'API Request',
            subjectName: `${log.method} ${log.url}`,
            details: `Status: ${log.statusCode}`,
            method: log.method,
            url: log.url,
            statusCode: log.statusCode,
            durationMs: log.durationMs,
            userId: log.userId,
            userName: log.userName,
        }));
        
        setMethodFilter('all');
        setStatusCodeFilter('all');

        switch (activeTab) {
            case 'vessel': return processMovements(movements);
            case 'action':
                const actionTypes: string[] = [ MovementEventType.BERTH_ASSIGNMENT, MovementEventType.PILOT_ASSIGNMENT, MovementEventType.AGENT_ASSIGNMENT, MovementEventType.CREATED ];
                return processMovements(movements.filter(log => actionTypes.includes(log.eventType)));
            case 'user': return processLogins(loginHistory);
            case 'interaction': return processInteractions(interactionLogs);
            case 'api': return processApiLogs(apiLogs);
            case 'all': default:
                return [ ...processMovements(movements), ...processLogins(loginHistory), ...processInteractions(interactionLogs), ...processApiLogs(apiLogs) ];
        }
    }, [activeTab, movements, loginHistory, interactionLogs, apiLogs, shipMap]);

    const filteredLogs = useMemo(() => {
        setCurrentPage(1); // Reset to first page on filter change
        
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() + 86400000 - 1 : Infinity;

        return displayedLogs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            if (logTime < start || logTime > end) {
                return false;
            }

            if (activeTab === 'api') {
                if (methodFilter !== 'all' && log.method !== methodFilter) return false;
                if (statusCodeFilter !== 'all' && log.statusCode?.toString() !== statusCodeFilter) return false;
            }
            
            if (!filter) return true;

            const lowerCaseFilter = filter.toLowerCase();
            return (
                log.subjectName.toLowerCase().includes(lowerCaseFilter) ||
                log.eventType.toLowerCase().includes(lowerCaseFilter) ||
                log.details.toLowerCase().includes(lowerCaseFilter) ||
                (log.tripId && log.tripId.toLowerCase().includes(lowerCaseFilter)) ||
                (log.userName && log.userName.toLowerCase().includes(lowerCaseFilter))
            );
        });
    }, [displayedLogs, filter, startDate, endDate, methodFilter, statusCodeFilter, activeTab]);

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
    
    const handleResetFilters = () => {
        setFilter('');
        setStartDate('');
        setEndDate('');
        setMethodFilter('all');
        setStatusCodeFilter('all');
        toast.success("Filters reset.");
    };

    const tabs: { id: LogTab; label: string }[] = [
        { id: 'all', label: 'All Events' },
        { id: 'vessel', label: 'Vessel Movements' },
        { id: 'action', label: 'Port Actions' },
        { id: 'user', label: 'User Sessions' },
        { id: 'interaction', label: 'UI Interactions' },
        { id: 'api', label: 'API Logs' },
    ];
    const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || 'System';

    const handleExportCSV = () => {
        if (!selectedPort) return;
        if (sortedLogs.length === 0) { toast.error('No log data to export.'); return; }
        let dataToExport;
        const filename = `${currentTabLabel.replace(/\s+/g, '_').toLowerCase()}_logs_${selectedPort.name.replace(/\s+/g, '_')}.csv`;
        
        switch(activeTab) {
            case 'api':
                dataToExport = sortedLogs.map(log => ({
                    'Timestamp': new Date(log.timestamp).toLocaleString(),
                    'Method': log.method,
                    'URL': log.url,
                    'Status': log.statusCode,
                    'Duration (ms)': log.durationMs,
                    'User': log.userName || 'N/A',
                }));
                break;
            default:
                 dataToExport = sortedLogs.map(log => ({
                    'Timestamp': new Date(log.timestamp).toLocaleString(),
                    'Subject': log.subjectName,
                    'Event Type': log.eventType,
                    'Details': log.details,
                    'Trip ID': log.tripId || 'N/A',
                }));
        }
        downloadCSV(dataToExport, filename);
    };

    const handleExportPDF = () => {
        if (!selectedPort) return;
        if (sortedLogs.length === 0) { toast.error('No log data to export.'); return; }
        const doc = new jsPDF({ orientation: 'landscape' });
        let tableColumns: string[];
        let tableRows: (string | number)[][];

        switch(activeTab) {
            case 'api':
                tableColumns = ['Timestamp', 'Method', 'URL', 'Status', 'Duration(ms)', 'User'];
                tableRows = sortedLogs.map(log => [
                    new Date(log.timestamp).toLocaleString(), log.method ?? '', log.url ?? '', log.statusCode ?? '', log.durationMs ?? '', log.userName || 'N/A',
                ]);
                break;
            default:
                tableColumns = ['Timestamp', 'Subject', 'Event Type', 'Trip ID', 'Details'];
                tableRows = sortedLogs.map(log => [
                    new Date(log.timestamp).toLocaleString(), log.subjectName, log.eventType, log.tripId ? log.tripId.split('-')[1] : '', log.details,
                ]);
        }
        
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
        doc.save(`${currentTabLabel.replace(/\s+/g, '_').toLowerCase()}_logs_${selectedPort.name.replace(/\s+/g, '_')}.pdf`);
    };
    
    const PaginationControls: React.FC = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center mt-4 text-sm text-gray-300">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    &larr; Previous
                </button>
                <span>Page {currentPage} of {totalPages} ({sortedLogs.length} total entries)</span>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    Next &rarr;
                </button>
            </div>
        );
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col" data-log-context="System Logs">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end">
                <div className={activeTab === 'api' ? 'lg:col-span-1' : 'lg:col-span-2'}>
                    <label htmlFor="text-filter" className="block text-xs font-medium text-gray-400 mb-1">Filter by Keyword</label>
                    <input id="text-filter" type="text" placeholder={`Filter ${currentTabLabel}...`} value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                {activeTab === 'api' && (
                    <>
                        <div>
                            <label htmlFor="method-filter" className="block text-xs font-medium text-gray-400 mb-1">HTTP Method</label>
                            <select id="method-filter" value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {uniqueMethods.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-400 mb-1">Status Code</label>
                            <select id="status-filter" value={statusCodeFilter} onChange={e => setStatusCodeFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {uniqueStatusCodes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </>
                )}
                <div>
                    <label htmlFor="start-date" className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                    <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                    <label htmlFor="end-date" className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                    <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                 <button onClick={handleResetFilters} className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 text-sm whitespace-nowrap lg:col-start-5">Reset Filters</button>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                        <tr>
                            <th className="px-4 py-3"><button onClick={() => requestSort('timestamp')} className="flex items-center gap-1 hover:text-white">Timestamp <SortIcon direction={getSortDirectionFor('timestamp')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('subjectName')} className="flex items-center gap-1 hover:text-white">Subject <SortIcon direction={getSortDirectionFor('subjectName')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('eventType')} className="flex items-center gap-1 hover:text-white">Event Type <SortIcon direction={getSortDirectionFor('eventType')} /></button></th>
                            {activeTab !== 'user' && activeTab !== 'interaction' && activeTab !== 'api' && <th className="px-4 py-3"><button onClick={() => requestSort('tripId')} className="flex items-center gap-1 hover:text-white">Trip ID <SortIcon direction={getSortDirectionFor('tripId')} /></button></th>}
                            <th className="px-4 py-3">Details</th>
                            {activeTab === 'api' && <th className="px-4 py-3"><button onClick={() => requestSort('userName')} className="flex items-center gap-1 hover:text-white">User <SortIcon direction={getSortDirectionFor('userName')} /></button></th>}
                            {activeTab === 'api' && <th className="px-4 py-3"><button onClick={() => requestSort('durationMs')} className="flex items-center gap-1 hover:text-white">Duration <SortIcon direction={getSortDirectionFor('durationMs')} /></button></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-800/50">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-4 py-3 font-medium text-white truncate max-w-xs">{log.subjectName}</td>
                                <td className="px-4 py-3"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 whitespace-nowrap">{log.eventType}</span></td>
                                {activeTab !== 'user' && activeTab !== 'interaction' && activeTab !== 'api' && <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.tripId ? log.tripId.split('-')[1] : '—'}</td>}
                                <td className="px-4 py-3">{log.details}</td>
                                {activeTab === 'api' && <td className="px-4 py-3">{log.userName || <span className="text-gray-500 italic">System</span>}</td>}
                                {activeTab === 'api' && <td className="px-4 py-3 text-cyan-300 whitespace-nowrap">{log.durationMs}ms</td>}
                            </tr>
                        ))}
                        {sortedLogs.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-500">{displayedLogs.length === 0 ? "No log entries available." : "No logs match your filters."}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
             <PaginationControls />
        </div>
    );
};

export default SystemLogs;