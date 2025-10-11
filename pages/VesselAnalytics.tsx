
import React, { useState, useEffect, useMemo } from 'react';
import type { Ship, Port, ShipMovement, Berth } from '../types';
import { ShipStatus, BerthType } from '../types';
import * as api from '../services/api';
import { useSortableData } from '../hooks/useSortableData';
import { formatDuration } from '../utils/formatters';
import { downloadCSV } from '../utils/export';
import SortIcon from '../components/SortIcon';
import ShipIcon from '../components/icons/ShipIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import { usePort } from '../context/PortContext';

interface VesselAnalyticsProps {
    selectedPort: Port;
}

interface VesselStat {
    shipId: string;
    shipName: string;
    shipImo: string;
    attendanceCount: number;
    totalStay: number;
    avgStay: number;
    minStay: number;
    maxStay: number;
    totalDockStay: number;
    totalAnchorageStay: number;
}

const KPICard: React.FC<{ icon: React.ElementType; title: string; value: string | number; description: string; }> = ({ icon: Icon, title, value, description }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center">
        <div className="p-3 bg-cyan-500/10 rounded-full mr-4">
            <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
    </div>
);


const VesselAnalyticsPage: React.FC<VesselAnalyticsProps> = ({ selectedPort }) => {
    const { ships, berths } = usePort();
    const [stats, setStats] = useState<VesselStat[]>([]);
    const [portStats, setPortStats] = useState({ 
        uniqueVessels: 0, 
        totalVisits: 0, 
        portWideAvgStay: 0,
        portWideAvgDockStay: 0,
        portWideAvgAnchorageStay: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const shipMap = useMemo(() => new Map(ships.map(s => [s.id, s])), [ships]);
    const berthMap = useMemo(() => new Map(berths.map(b => [b.id, b])), [berths]);

    useEffect(() => {
        if (!selectedPort) return;

        const processHistory = async () => {
            setIsLoading(true);
            try {
                const history = await api.getHistoryForPort(selectedPort.id);

                // FIX: Refactor reduce to a for...of loop to help with type inference.
                const historyByShip: { [shipId: string]: ShipMovement[] } = {};
                for (const mov of history) {
                    if (!historyByShip[mov.shipId]) {
                        historyByShip[mov.shipId] = [];
                    }
                    historyByShip[mov.shipId].push(mov);
                }

                const vesselStats: VesselStat[] = [];
                let totalVisits = 0;
                let totalStayMs = 0;
                let totalDockStayMs = 0;
                let totalAnchorageStayMs = 0;

                for (const shipId in historyByShip) {
                    const shipMovements = historyByShip[shipId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    const visitDurations: number[] = [];
                    let shipTotalDockStay = 0;
                    let shipTotalAnchorageStay = 0;
                    
                    let visitStartIdx = 0;
                    while (visitStartIdx < shipMovements.length) {
                        const visitEndIdx = shipMovements.findIndex((m, i) => i >= visitStartIdx && m.details.status === ShipStatus.LEFT_PORT);
                        if (visitEndIdx === -1) break;

                        const visitMovements = shipMovements.slice(visitStartIdx, visitEndIdx + 1);
                        if (visitMovements.length < 2) {
                            visitStartIdx = visitEndIdx + 1;
                            continue;
                        }
                        
                        const visitStartTime = new Date(visitMovements[0].timestamp).getTime();
                        const visitEndTime = new Date(visitMovements[visitMovements.length - 1].timestamp).getTime();
                        visitDurations.push(visitEndTime - visitStartTime);
                        
                        let visitDockStay = 0;
                        let visitAnchorageStay = 0;

                        for (let i = 0; i < visitMovements.length - 1; i++) {
                            const currentMov = visitMovements[i];
                            const nextMov = visitMovements[i + 1];
                            const duration = new Date(nextMov.timestamp).getTime() - new Date(currentMov.timestamp).getTime();

                            if (currentMov.details.berthIds && currentMov.details.berthIds.length > 0) {
                                const primaryBerthId = currentMov.details.berthIds[0];
                                const berth = berthMap.get(primaryBerthId);
                                if (berth?.type === BerthType.ANCHORAGE) {
                                    visitAnchorageStay += duration;
                                } else if (berth) {
                                    visitDockStay += duration;
                                }
                            }
                        }
                        shipTotalDockStay += visitDockStay;
                        shipTotalAnchorageStay += visitAnchorageStay;
                        visitStartIdx = visitEndIdx + 1;
                    }

                    if (visitDurations.length > 0) {
                        const totalDuration = visitDurations.reduce((a, b) => a + b, 0);
                        const shipInfo = shipMap.get(shipId);

                        vesselStats.push({
                            shipId: shipId,
                            shipName: shipInfo?.name || 'Unknown',
                            shipImo: shipInfo?.imo || 'N/A',
                            attendanceCount: visitDurations.length,
                            totalStay: totalDuration,
                            avgStay: totalDuration / visitDurations.length,
                            minStay: Math.min(...visitDurations),
                            maxStay: Math.max(...visitDurations),
                            totalDockStay: shipTotalDockStay,
                            totalAnchorageStay: shipTotalAnchorageStay,
                        });
                        totalVisits += visitDurations.length;
                        totalStayMs += totalDuration;
                        totalDockStayMs += shipTotalDockStay;
                        totalAnchorageStayMs += shipTotalAnchorageStay;
                    }
                }
                
                setStats(vesselStats);
                setPortStats({
                    uniqueVessels: vesselStats.length,
                    totalVisits: totalVisits,
                    portWideAvgStay: totalVisits > 0 ? totalStayMs / totalVisits : 0,
                    portWideAvgDockStay: totalVisits > 0 ? totalDockStayMs / totalVisits : 0,
                    portWideAvgAnchorageStay: totalVisits > 0 ? totalAnchorageStayMs / totalVisits : 0,
                });

            } catch (error) {
                console.error("Failed to process vessel analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        processHistory();
    }, [selectedPort, shipMap, berthMap]);
    
    const { items: sortedStats, requestSort, sortConfig } = useSortableData<VesselStat>(stats, { key: 'shipName', direction: 'ascending' });
    
    const getSortDirectionFor = (key: keyof VesselStat) => {
        if (!sortConfig) return undefined;
        return sortConfig.key === key ? sortConfig.direction : undefined;
    };

    const handleExport = () => {
        const dataToExport = sortedStats.map(stat => ({
            'Vessel Name': stat.shipName,
            'IMO': stat.shipImo,
            'Attendance Count': stat.attendanceCount,
            'Total Stay': formatDuration(stat.totalStay),
            'Avg Stay': formatDuration(stat.avgStay),
            'Min Stay': formatDuration(stat.minStay),
            'Max Stay': formatDuration(stat.maxStay),
            'Total Dock Stay': formatDuration(stat.totalDockStay),
            'Total Anchorage Stay': formatDuration(stat.totalAnchorageStay),
        }));
        downloadCSV(dataToExport, `vessel_analytics_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
    };
    
    if (isLoading) {
        return <div className="text-center p-8">Loading vessel analytics...</div>;
    }

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Vessel Attendance Analytics: {selectedPort.name}</h1>
                 <button
                    onClick={handleExport}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                 >
                    <DownloadIcon className="w-4 h-4" />
                    Export to CSV
                 </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
                <KPICard icon={ShipIcon} title="Unique Vessels" value={portStats.uniqueVessels} description="Total distinct vessels with a recorded visit" />
                <KPICard icon={ChartBarIcon} title="Total Port Visits" value={portStats.totalVisits} description="Total completed visits by all vessels" />
                <KPICard icon={ChartBarIcon} title="Port-Wide Average Stay" value={formatDuration(portStats.portWideAvgStay)} description="Average duration of a single port visit" />
                <KPICard icon={ChartBarIcon} title="Average Dock Stay" value={formatDuration(portStats.portWideAvgDockStay)} description="Average time spent at berth/quay" />
                <KPICard icon={ChartBarIcon} title="Average Anchorage Stay" value={formatDuration(portStats.portWideAvgAnchorageStay)} description="Average time spent at anchorage" />
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                        <tr>
                            <th className="px-4 py-3"><button onClick={() => requestSort('shipName')} className="flex items-center gap-1 hover:text-white">Vessel Name <SortIcon direction={getSortDirectionFor('shipName')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('attendanceCount')} className="flex items-center gap-1 hover:text-white">Visits <SortIcon direction={getSortDirectionFor('attendanceCount')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('totalStay')} className="flex items-center gap-1 hover:text-white">Total Stay <SortIcon direction={getSortDirectionFor('totalStay')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('totalDockStay')} className="flex items-center gap-1 hover:text-white">Total Dock Stay <SortIcon direction={getSortDirectionFor('totalDockStay')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('totalAnchorageStay')} className="flex items-center gap-1 hover:text-white">Total Anchorage Stay <SortIcon direction={getSortDirectionFor('totalAnchorageStay')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('avgStay')} className="flex items-center gap-1 hover:text-white">Average Stay <SortIcon direction={getSortDirectionFor('avgStay')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('minStay')} className="flex items-center gap-1 hover:text-white">Min Stay <SortIcon direction={getSortDirectionFor('minStay')} /></button></th>
                            <th className="px-4 py-3"><button onClick={() => requestSort('maxStay')} className="flex items-center gap-1 hover:text-white">Max Stay <SortIcon direction={getSortDirectionFor('maxStay')} /></button></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedStats.map(stat => (
                            <tr key={stat.shipId} className="hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium text-white">{stat.shipName} <span className="text-gray-400 font-normal">({stat.shipImo})</span></td>
                                <td className="px-4 py-3 text-center">{stat.attendanceCount}</td>
                                <td className="px-4 py-3">{formatDuration(stat.totalStay)}</td>
                                <td className="px-4 py-3">{formatDuration(stat.totalDockStay)}</td>
                                <td className="px-4 py-3">{formatDuration(stat.totalAnchorageStay)}</td>
                                <td className="px-4 py-3">{formatDuration(stat.avgStay)}</td>
                                <td className="px-4 py-3">{formatDuration(stat.minStay)}</td>
                                <td className="px-4 py-3">{formatDuration(stat.maxStay)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {stats.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-gray-500">No completed vessel visit history found for this port.</div>
                )}
            </div>
        </div>
    );
};

export default VesselAnalyticsPage;