import React, { useState, useEffect, useMemo } from 'react';
import type { Ship, Port, ShipMovement, Berth } from '../types';
import { ShipStatus, BerthType, InteractionEventType } from '../types';
import * as api from '../services/api';
import { useSortableData } from '../hooks/useSortableData';
import { formatDuration } from '../utils/formatters';
import { downloadCSV } from '../utils/export';
import SortIcon from '../components/icons/SortIcon';
import ShipIcon from '../components/icons/ShipIcon';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import DownloadIcon from '../components/icons/DownloadIcon';
import { usePort } from '../context/PortContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import { useLogger } from '../context/InteractionLoggerContext';

interface VesselStat {
    shipId: string; shipName: string; shipImo: string; attendanceCount: number;
    totalStay: number; avgStay: number; minStay: number; maxStay: number;
    totalDockStay: number; totalAnchorageStay: number;
}

const KPICard: React.FC<{ icon: React.ElementType; title: string; value: string | number; description: string; }> = ({ icon: Icon, title, value, description }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center">
        <div className="p-3 bg-cyan-500/10 rounded-full mr-4"><Icon className="w-6 h-6 text-cyan-400" /></div>
        <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
    </div>
);

const VesselAnalytics: React.FC = () => {
    const { state } = usePort();
    const { ships, berths, selectedPort, isLoading: isPortLoading } = state;
    const { log } = useLogger();
    const [stats, setStats] = useState<VesselStat[]>([]);
    const [portStats, setPortStats] = useState({ uniqueVessels: 0, totalVisits: 0, portWideAvgStay: 0, portWideAvgDockStay: 0, portWideAvgAnchorageStay: 0 });
    const [isCalculating, setIsCalculating] = useState(true);

    useEffect(() => {
        setIsCalculating(true);
        
        if (isPortLoading || !selectedPort) {
            setStats([]);
            setPortStats({ uniqueVessels: 0, totalVisits: 0, portWideAvgStay: 0, portWideAvgDockStay: 0, portWideAvgAnchorageStay: 0 });
            return;
        }

        let isMounted = true;
        
        api.getHistoryForPort(selectedPort.id).then(history => {
            if (!isMounted) return;

            const shipMap = new Map(ships.map(s => [s.id, s]));
            const berthMap = new Map(berths.map(b => [b.id, b]));

            // 1. Filter for data before today ("day-1")
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const historicalMovements = history.filter(mov => new Date(mov.timestamp).getTime() < today.getTime());

            // 2. Group all movements by trip ID
            const trips: { [tripId: string]: ShipMovement[] } = {};
            for (const mov of historicalMovements) {
                if (!mov.tripId) continue;
                if (!trips[mov.tripId]) trips[mov.tripId] = [];
                trips[mov.tripId].push(mov);
            }

            const statsByShip: { [shipId: string]: { durations: number[], dockMs: number, anchorageMs: number } } = {};

            // 3. Process each trip
            for (const tripId in trips) {
                const tripMovements = trips[tripId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                // 4. A trip is only complete for analytics if it has a "Left Port" event.
                const hasLeftPortEvent = tripMovements.some(m => m.details.status === ShipStatus.LEFT_PORT);
                if (!hasLeftPortEvent || tripMovements.length < 2) {
                    continue; // Skip active or incomplete trips
                }

                const shipId = tripMovements[0].shipId;
                if (!shipId || !shipMap.has(shipId)) continue; 

                if (!statsByShip[shipId]) {
                    statsByShip[shipId] = { durations: [], dockMs: 0, anchorageMs: 0 };
                }

                // 5. Calculate total trip duration
                const tripStart = new Date(tripMovements[0].timestamp).getTime();
                const tripEnd = new Date(tripMovements[tripMovements.length - 1].timestamp).getTime();
                statsByShip[shipId].durations.push(tripEnd - tripStart);

                // 6. Calculate dwell and anchorage time for this trip
                for (let i = 0; i < tripMovements.length - 1; i++) {
                    const currentMov = tripMovements[i];
                    const nextMov = tripMovements[i + 1];
                    const durationInState = new Date(nextMov.timestamp).getTime() - new Date(currentMov.timestamp).getTime();
                    
                    const berthIds = currentMov.details.berthIds || [];
                    const isAtDock = berthIds.some(id => {
                        const berth = berthMap.get(id);
                        return berth && (berth.type === BerthType.BERTH || berth.type === BerthType.QUAY);
                    });
                    const isAtAnchorage = berthIds.some(id => berthMap.get(id)?.type === BerthType.ANCHORAGE);

                    if (isAtDock) {
                        statsByShip[shipId].dockMs += durationInState;
                    } else if (isAtAnchorage) {
                        statsByShip[shipId].anchorageMs += durationInState;
                    }
                }
            }
            
            // 7. Consolidate stats
            const finalStats: VesselStat[] = [];
            for (const shipId in statsByShip) {
                const shipData = statsByShip[shipId];
                if (shipData.durations.length > 0) {
                    const totalStay = shipData.durations.reduce((a, b) => a + b, 0);
                    const shipInfo = shipMap.get(shipId);
                    finalStats.push({
                        shipId: shipId,
                        shipName: shipInfo?.name || 'Unknown',
                        shipImo: shipInfo?.imo || 'N/A',
                        attendanceCount: shipData.durations.length,
                        totalStay: totalStay,
                        avgStay: totalStay / shipData.durations.length,
                        minStay: Math.min(...shipData.durations),
                        maxStay: Math.max(...shipData.durations),
                        totalDockStay: shipData.dockMs,
                        totalAnchorageStay: shipData.anchorageMs,
                    });
                }
            }

            // 8. Calculate port-wide stats and update state once
            const totalVisits = finalStats.reduce((sum, stat) => sum + stat.attendanceCount, 0);
            const totalStayMs = finalStats.reduce((sum, stat) => sum + stat.totalStay, 0);
            const totalDockStayMs = finalStats.reduce((sum, stat) => sum + stat.totalDockStay, 0);
            const totalAnchorageStayMs = finalStats.reduce((sum, stat) => sum + stat.totalAnchorageStay, 0);
            
            setStats(finalStats);
            setPortStats({
                uniqueVessels: finalStats.length,
                totalVisits: totalVisits,
                portWideAvgStay: totalVisits > 0 ? totalStayMs / totalVisits : 0,
                portWideAvgDockStay: totalVisits > 0 ? totalDockStayMs / totalVisits : 0,
                portWideAvgAnchorageStay: totalVisits > 0 ? totalAnchorageStayMs / totalVisits : 0,
            });

        }).catch(err => {
            console.error("Failed to calculate vessel analytics:", err);
            toast.error("Could not load analytics data.");
        }).finally(() => {
            if (isMounted) {
                setIsCalculating(false);
            }
        });

        return () => { isMounted = false; };
    }, [selectedPort, isPortLoading, ships, berths]);
    
    const { items: sortedStats, requestSort, sortConfig } = useSortableData<VesselStat>(stats, { key: 'shipName', direction: 'ascending' });
    const getSortDirectionFor = (key: keyof VesselStat) => sortConfig?.key === key ? sortConfig.direction : undefined;

    const chartData = useMemo(() => {
        if (!stats) return [];
        return stats
            .sort((a, b) => b.attendanceCount - a.attendanceCount)
            .slice(0, 5)
            .map(stat => ({
                name: stat.shipName,
                'Dwell Time (Hours)': parseFloat((stat.totalDockStay / (1000 * 60 * 60)).toFixed(1)),
                'Anchorage Stay (Hours)': parseFloat((stat.totalAnchorageStay / (1000 * 60 * 60)).toFixed(1)),
            }));
    }, [stats]);

    const handleExport = () => {
        if (!selectedPort) return;
        log(InteractionEventType.DATA_EXPORT, { action: 'Export Vessel Analytics to CSV' });
        const dataToExport = sortedStats.map(stat => ({
            'Vessel Name': stat.shipName, 'IMO': stat.shipImo, 'Visits': stat.attendanceCount,
            'Total Stay': formatDuration(stat.totalStay), 
            'Total Dwell Time': formatDuration(stat.totalDockStay),
            'Total Anchorage Stay': formatDuration(stat.totalAnchorageStay),
            'Avg Stay': formatDuration(stat.avgStay),
            'Min Stay': formatDuration(stat.minStay), 'Max Stay': formatDuration(stat.maxStay),
        }));
        downloadCSV(dataToExport, `vessel_analytics_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
    };
    
    const columnLabels: Record<string, string> = {
        shipName: 'Vessel',
        attendanceCount: 'Visits',
        totalStay: 'Total Stay',
        totalDockStay: 'Total Dwell Time',
        totalAnchorageStay: 'Total Anchorage Stay',
        avgStay: 'Avg Stay',
        minStay: 'Min Stay',
        maxStay: 'Max Stay',
    };

    const columns: (keyof VesselStat)[] = ['shipName', 'attendanceCount', 'totalStay', 'totalDockStay', 'totalAnchorageStay', 'avgStay', 'minStay', 'maxStay'];
    
    if (isPortLoading || isCalculating) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg text-gray-200">Calculating Vessel Analytics...</p>
                </div>
            </div>
        );
    }
    
    if (!selectedPort) {
        return <div className="text-center p-8 text-gray-400">Please select a port to view analytics.</div>;
    }

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col" data-log-context="Vessel Analytics">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Vessel Analytics: {selectedPort?.name}</h1>
                <button onClick={handleExport} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
                <KPICard icon={ShipIcon} title="Unique Vessels" value={portStats.uniqueVessels} description="Total distinct vessels with recorded visits" />
                <KPICard icon={ChartBarIcon} title="Total Visits" value={portStats.totalVisits} description="Total completed visits by all vessels" />
                <KPICard icon={ChartBarIcon} title="Avg. Port Stay" value={formatDuration(portStats.portWideAvgStay)} description="Average duration of a single port visit" />
                <KPICard icon={ChartBarIcon} title="Avg. Dwell Time" value={formatDuration(portStats.portWideAvgDockStay)} description="Average time spent at berth/quay" />
                <KPICard icon={ChartBarIcon} title="Avg. Anchorage Stay" value={formatDuration(portStats.portWideAvgAnchorageStay)} description="Average time spent at anchorage" />
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Top 5 Vessels by Visits: Stay Analysis</h2>
                {chartData.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#A0AEC0" label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} 
                                    labelStyle={{ color: '#E2E8F0' }}
                                    formatter={(value: number) => `${value.toFixed(1)} hrs`}
                                />
                                <Legend wrapperStyle={{ color: '#E2E8F0' }}/>
                                <Bar dataKey="Dwell Time (Hours)" fill="#38B2AC" />
                                <Bar dataKey="Anchorage Stay (Hours)" fill="#63B3ED" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">Not enough historical data to display chart.</p>
                )}
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                        <tr>
                             {columns.map(key => (
                                <th className="px-4 py-3" key={key}><button onClick={() => requestSort(key)} className="flex items-center gap-1 hover:text-white capitalize">{columnLabels[key]} <SortIcon direction={getSortDirectionFor(key)} /></button></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedStats.map(stat => (
                            <tr key={stat.shipId} className="hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium text-white">{stat.shipName} <span className="text-gray-400">({stat.shipImo})</span></td>
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
                 {stats.length === 0 && <div className="text-center py-8 text-gray-500">No completed vessel visit history found for this port.</div>}
            </div>
        </div>
    );
};

export default VesselAnalytics;