import React, { useState, useEffect, useMemo } from 'react';
import type { Ship, Port, ShipMovement, Berth } from '../types';
import { ShipStatus, BerthType } from '../types';
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
    const { ships, berths, selectedPort } = state;
    const [stats, setStats] = useState<VesselStat[]>([]);
    const [portStats, setPortStats] = useState({ uniqueVessels: 0, totalVisits: 0, portWideAvgStay: 0, portWideAvgDockStay: 0, portWideAvgAnchorageStay: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const shipMap = useMemo(() => new Map(ships.map(s => [s.id, s])), [ships]);
    const berthMap = useMemo(() => new Map(berths.map(b => [b.id, b])), [berths]);

    useEffect(() => {
        if (!selectedPort) return;
        setIsLoading(true);
        api.getHistoryForPort(selectedPort.id).then(history => {
            const historyByShip: { [shipId: string]: ShipMovement[] } = {};
            for (const mov of history) {
                if (!historyByShip[mov.shipId]) historyByShip[mov.shipId] = [];
                historyByShip[mov.shipId].push(mov);
            }
            
            const vesselStats: VesselStat[] = [];
            let totalVisits = 0, totalStayMs = 0, totalDockStayMs = 0, totalAnchorageStayMs = 0;

            for (const shipId in historyByShip) {
                const movements = historyByShip[shipId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                const visitDurations: number[] = [];
                let shipTotalDockStay = 0, shipTotalAnchorageStay = 0;
                
                let visitStartIdx = 0;
                while (visitStartIdx < movements.length) {
                    const visitEndIdx = movements.findIndex((m, i) => i > visitStartIdx && (m.details.status === ShipStatus.LEFT_PORT || m.details.fromStatus !== m.details.status));
                    if (visitEndIdx === -1) break;

                    const visitMovements = movements.slice(visitStartIdx, visitEndIdx + 1);
                    if (visitMovements.length < 2) { visitStartIdx = visitEndIdx + 1; continue; }
                    
                    visitDurations.push(new Date(visitMovements[visitMovements.length - 1].timestamp).getTime() - new Date(visitMovements[0].timestamp).getTime());
                    
                    for (let i = 0; i < visitMovements.length - 1; i++) {
                        const duration = new Date(visitMovements[i+1].timestamp).getTime() - new Date(visitMovements[i].timestamp).getTime();
                        const berthId = visitMovements[i].details.berthIds?.[0];
                        const berth = berthId ? berthMap.get(berthId) : null;
                        if (berth?.type === BerthType.ANCHORAGE) shipTotalAnchorageStay += duration;
                        else if (berth) shipTotalDockStay += duration;
                    }
                    visitStartIdx = visitEndIdx + 1;
                }

                if (visitDurations.length > 0) {
                    const totalDuration = visitDurations.reduce((a, b) => a + b, 0);
                    const shipInfo = shipMap.get(shipId);
                    vesselStats.push({
                        shipId, shipName: shipInfo?.name || 'Unknown', shipImo: shipInfo?.imo || 'N/A',
                        attendanceCount: visitDurations.length, totalStay: totalDuration, avgStay: totalDuration / visitDurations.length,
                        minStay: Math.min(...visitDurations), maxStay: Math.max(...visitDurations),
                        totalDockStay: shipTotalDockStay, totalAnchorageStay: shipTotalAnchorageStay,
                    });
                    totalVisits += visitDurations.length; totalStayMs += totalDuration;
                    totalDockStayMs += shipTotalDockStay; totalAnchorageStayMs += shipTotalAnchorageStay;
                }
            }
            setStats(vesselStats);
            setPortStats({
                uniqueVessels: vesselStats.length, totalVisits,
                portWideAvgStay: totalVisits > 0 ? totalStayMs / totalVisits : 0,
                portWideAvgDockStay: totalVisits > 0 ? totalDockStayMs / totalVisits : 0,
                portWideAvgAnchorageStay: totalVisits > 0 ? totalAnchorageStayMs / totalVisits : 0,
            });
        }).finally(() => setIsLoading(false));
    }, [selectedPort, shipMap, berthMap]);
    
    const { items: sortedStats, requestSort, sortConfig } = useSortableData<VesselStat>(stats, { key: 'shipName', direction: 'ascending' });
    const getSortDirectionFor = (key: keyof VesselStat) => sortConfig?.key === key ? sortConfig.direction : undefined;

    const chartData = useMemo(() => {
        if (!stats) return [];
        return stats
            .sort((a, b) => b.attendanceCount - a.attendanceCount)
            .slice(0, 5)
            .map(stat => ({
                name: stat.shipName,
                'Dock Stay (Hours)': parseFloat((stat.totalDockStay / (1000 * 60 * 60)).toFixed(1)),
                'Anchorage Stay (Hours)': parseFloat((stat.totalAnchorageStay / (1000 * 60 * 60)).toFixed(1)),
            }));
    }, [stats]);

    const handleExport = () => {
        if (!selectedPort) return;
        const dataToExport = sortedStats.map(stat => ({
            'Vessel Name': stat.shipName, 'IMO': stat.shipImo, 'Visits': stat.attendanceCount,
            'Total Stay': formatDuration(stat.totalStay), 'Avg Stay': formatDuration(stat.avgStay),
            'Min Stay': formatDuration(stat.minStay), 'Max Stay': formatDuration(stat.maxStay),
            'Total Dock Stay': formatDuration(stat.totalDockStay), 'Total Anchorage Stay': formatDuration(stat.totalAnchorageStay),
        }));
        downloadCSV(dataToExport, `vessel_analytics_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
    };
    
    if (isLoading) return <div className="text-center p-8 text-gray-200">Loading vessel analytics...</div>;

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Vessel Analytics: {selectedPort?.name}</h1>
                <button onClick={handleExport} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export CSV</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
                <KPICard icon={ShipIcon} title="Unique Vessels" value={portStats.uniqueVessels} description="Total distinct vessels with recorded visits" />
                <KPICard icon={ChartBarIcon} title="Total Visits" value={portStats.totalVisits} description="Total completed visits by all vessels" />
                <KPICard icon={ChartBarIcon} title="Avg. Port Stay" value={formatDuration(portStats.portWideAvgStay)} description="Average duration of a single port visit" />
                <KPICard icon={ChartBarIcon} title="Avg. Dock Stay" value={formatDuration(portStats.portWideAvgDockStay)} description="Average time spent at berth/quay" />
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
                                <Bar dataKey="Dock Stay (Hours)" fill="#38B2AC" />
                                <Bar dataKey="Anchorage Stay (Hours)" fill="#63B3ED" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">Not enough data to display chart.</p>
                )}
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300 min-w-[1000px]">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
                        <tr>
                             {['shipName', 'attendanceCount', 'totalStay', 'totalDockStay', 'totalAnchorageStay', 'avgStay', 'minStay', 'maxStay'].map(key => (
                                <th className="px-4 py-3" key={key}><button onClick={() => requestSort(key as keyof VesselStat)} className="flex items-center gap-1 hover:text-white capitalize">{key.replace('shipName','Vessel').replace('Stay',' Stay').replace('attendanceCount','Visits')} <SortIcon direction={getSortDirectionFor(key as keyof VesselStat)} /></button></th>
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