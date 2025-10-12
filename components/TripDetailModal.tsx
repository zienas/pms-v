import React, { useState, useMemo, useEffect } from 'react';
import type { Trip, User, ShipMovement, Berth, Port } from '../types';
import { TripStatus, MovementEventType } from '../types';
import * as api from '../services/api';
import CloseIcon from './icons/CloseIcon';
import ShipIcon from './icons/ShipIcon';
import ClockIcon from './icons/ClockIcon';
import PilotIcon from './icons/PilotIcon';
import { formatDuration } from '../utils/formatters';
import PDFIcon from './icons/PDFIcon';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { usePort } from '../context/PortContext';

interface TripDetailModalProps {
    pilots: User[];
    agents: User[];
    selectedPort: Port | null;
    onClose: () => void;
    onViewHistory: (trip: Trip) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
    <div className={fullWidth ? 'col-span-2' : ''}>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-md font-semibold text-white truncate">{value}</p>
    </div>
);

const TripDetailModal: React.FC<TripDetailModalProps> = ({ pilots, agents, selectedPort, onClose, onViewHistory }) => {
    const { selectedTripForDetail: trip, updateTrip, berths } = usePort();
    const [formData, setFormData] = useState<Trip>(trip);
    const [movements, setMovements] = useState<ShipMovement[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const fullHistory = await api.getShipHistory(trip.portId, trip.shipId);
                const tripMovements = fullHistory.filter(m => m.tripId === trip.id);
                setMovements(tripMovements);
            } catch (error) {
                console.error("Failed to fetch ship history for trip:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();

        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, [trip]);

    useEffect(() => {
        setFormData(trip);
    }, [trip]);
    
    const userMap = useMemo(() => {
        const map = new Map<string, string>();
        pilots.forEach(p => map.set(p.id, p.name));
        agents.forEach(a => map.set(a.id, a.name));
        return map;
    }, [pilots, agents]);
    
    const stopoverTimeline = useMemo(() => {
        type LocationStay = {
            location: string;
            arrival: string;
            departure: string | null;
            durationMs: number | null;
            pilotOnArrival: string | null;
            pilotOnDeparture: string | null;
        };

        const stays: { [locationName: string]: LocationStay } = {};
        const completedStays: LocationStay[] = [];
        const chronologicalMovements = [...movements].reverse();

        chronologicalMovements.forEach(event => {
            if (event.eventType !== MovementEventType.BERTH_ASSIGNMENT) return;

            const from = event.details.fromBerthNames?.join(' & ') || 'Unassigned';
            const to = event.details.berthNames?.join(' & ') || 'Unassigned';

            if (from !== to) {
                if (from !== 'Unassigned' && stays[from]) {
                    stays[from].departure = event.timestamp;
                    stays[from].durationMs = new Date(event.timestamp).getTime() - new Date(stays[from].arrival).getTime();
                    stays[from].pilotOnDeparture = event.details.pilotId ? userMap.get(event.details.pilotId) || 'Unknown' : null;
                    completedStays.push(stays[from]);
                    delete stays[from];
                }
                if (to !== 'Unassigned') {
                    const pilotName = event.details.pilotId ? userMap.get(event.details.pilotId) || 'Unknown' : null;
                    stays[to] = {
                        location: to,
                        arrival: event.timestamp,
                        departure: null,
                        durationMs: null,
                        pilotOnArrival: pilotName,
                        pilotOnDeparture: null,
                    };
                }
            }
        });
        
        Object.values(stays).forEach(ongoingStay => {
            ongoingStay.durationMs = now.getTime() - new Date(ongoingStay.arrival).getTime();
            completedStays.push(ongoingStay);
        });
        
        return completedStays.sort((a, b) => new Date(b.arrival).getTime() - new Date(a.arrival).getTime());
    }, [movements, now, userMap]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value || undefined }));
    };

    const handleSave = () => {
        updateTrip(formData.id, formData).then(onClose);
    };
    
    const duration = trip.departureTimestamp 
        ? formatDuration(new Date(trip.departureTimestamp).getTime() - new Date(trip.arrivalTimestamp).getTime()) 
        : formatDuration(Date.now() - new Date(trip.arrivalTimestamp).getTime());

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        const agentName = agents.find(a => a.id === trip.agentId)?.name || 'N/A';
        const pilotName = pilots.find(p => p.id === trip.pilotId)?.name || 'N/A';
        const hasLogo = selectedPort?.logoImage;

        doc.setFontSize(18);

        if (hasLogo) {
            doc.addImage(selectedPort.logoImage, 'PNG', 14, 15, 20, 20); // x, y, w, h
            doc.text(`Trip Detail Report: ${trip.id}`, 40, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Vessel: ${trip.vesselName} (IMO: ${trip.vesselImo})`, 40, 30);
        } else {
            doc.text(`Trip Detail Report: ${trip.id}`, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Vessel: ${trip.vesselName} (IMO: ${trip.vesselImo})`, 14, 30);
        }

        const tableBody = [
            ['Status', trip.status],
            ['Arrival', new Date(trip.arrivalTimestamp).toLocaleString()],
            ['Departure', trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : '—'],
            ['Duration', duration],
            ['Maritime Agent', agentName],
            ['Assigned Pilot', pilotName],
        ];

        (doc as any).autoTable({
            startY: 40,
            head: [['Field', 'Value']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [38, 50, 56] }
        });

        if (stopoverTimeline.length > 0) {
             (doc as any).autoTable({
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Stopover Timeline']],
                body: [],
                theme: 'plain',
                styles: { fontStyle: 'bold', fontSize: 12 }
            });

            const timelineColumns = ["Location", "Arrival", "Departure", "Duration", "Pilot (Arr)", "Pilot (Dep)"];
            const timelineRows = stopoverTimeline.map(stay => [
                stay.location,
                new Date(stay.arrival).toLocaleString(),
                stay.departure ? new Date(stay.departure).toLocaleString() : 'Present',
                stay.durationMs !== null ? formatDuration(stay.durationMs) : '',
                stay.pilotOnArrival || 'N/A',
                stay.pilotOnDeparture || (stay.departure ? 'N/A' : '')
            ]);

            (doc as any).autoTable({
                head: [timelineColumns],
                body: timelineRows,
                theme: 'grid',
                headStyles: { fillColor: [38, 50, 56] },
                styles: { fontSize: 8 },
            });
        }

        doc.save(`trip_report_${trip.id}.pdf`);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl border border-gray-700 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-start flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Trip Details</h2>
                        <p className="text-cyan-400 font-mono text-sm">ID: {trip.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="mt-6 space-y-4 overflow-y-auto pr-2">
                     <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-2">
                           <ShipIcon className="w-5 h-5 text-gray-400" />
                           Vessel & Trip Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Vessel Name" value={trip.vesselName || 'N/A'} />
                            <DetailItem label="IMO" value={trip.vesselImo || 'N/A'} />
                            <DetailItem label="Status" value={trip.status} />
                            <DetailItem label="Duration" value={duration} />
                            <DetailItem label="Arrival" value={new Date(trip.arrivalTimestamp).toLocaleString()} fullWidth />
                            <DetailItem label="Departure" value={trip.departureTimestamp ? new Date(trip.departureTimestamp).toLocaleString() : '—'} fullWidth />
                        </div>
                    </div>

                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                         <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-2">
                           <PilotIcon className="w-5 h-5 text-gray-400" />
                           Personnel Assignments
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="agentId" className="block text-sm font-medium text-gray-300">Maritime Agent</label>
                                <select id="agentId" name="agentId" value={formData.agentId || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    <option value="">-- No Agent --</option>
                                    {agents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="pilotId" className="block text-sm font-medium text-gray-300">Assigned Pilot</label>
                                <select id="pilotId" name="pilotId" value={formData.pilotId || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    <option value="">-- No Pilot --</option>
                                    {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-2">
                           <ClockIcon className="w-5 h-5 text-gray-400" />
                           Stopover Timeline
                        </h3>
                        {isLoadingHistory ? (
                            <p>Loading history...</p>
                        ) : stopoverTimeline.length === 0 ? (
                            <p className="text-gray-500 text-sm">No berthing movements recorded for this stopover.</p>
                        ) : (
                            <div className="overflow-y-auto max-h-60">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Location</th>
                                            <th className="px-4 py-2">Arrival</th>
                                            <th className="px-4 py-2">Departure</th>
                                            <th className="px-4 py-2">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {stopoverTimeline.map((stay, index) => (
                                            <tr key={index} className="hover:bg-gray-700/50">
                                                <td className="px-4 py-2 font-medium">{stay.location}</td>
                                                <td className="px-4 py-2">{new Date(stay.arrival).toLocaleString()}</td>
                                                <td className="px-4 py-2">
                                                    {stay.departure ? new Date(stay.departure).toLocaleString() : <span className="text-green-400 font-semibold">Present</span>}
                                                </td>
                                                <td className="px-4 py-2">
                                                    {stay.durationMs !== null ? formatDuration(stay.durationMs) : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-6 flex justify-between items-center flex-shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => onViewHistory(trip)}
                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                            <ClockIcon className="w-4 h-4" /> View Full History
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-4 py-2 bg-red-700 text-white text-sm rounded-md hover:bg-red-800 transition-colors flex items-center gap-2"
                        >
                           <PDFIcon className="w-4 h-4" /> Export as PDF
                        </button>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button type="button" onClick={handleSave} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripDetailModal;