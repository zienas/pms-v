import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Ship, ShipMovement } from '../types';
import { MovementEventType, UserRole, InteractionEventType } from '../types';
import * as api from '../services/api';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import PilotIcon from '../components/icons/PilotIcon';
import HistoryIcon from '../components/icons/HistoryIcon';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/formatters';
import ExternalLinkIcon from './icons/ExternalLinkIcon';
import CloseIcon from './icons/CloseIcon';
import { useLogger } from '../context/InteractionLoggerContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePort } from '../context/PortContext';
import addHeaderWithLogo from '../utils/pdfUtils';
import PDFIcon from './icons/PDFIcon';
import { toast } from 'react-hot-toast';

interface ShipHistoryModalProps {
  ship: Ship;
  portId: string;
  onClose: () => void;
}

const ShipHistoryModal: React.FC<ShipHistoryModalProps> = ({ ship, portId, onClose }) => {
  const { currentUser, users } = useAuth();
  const { state: portState } = usePort();
  const { selectedPort } = portState;
  const { log } = useLogger();
  const [history, setHistory] = useState<ShipMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const contentRef = useRef<HTMLDivElement>(null);
  
  const canExport = useMemo(() => {
    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERVISOR;
  }, [currentUser.role]);
  
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const data = await api.getShipHistory(portId, ship.id);
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch ship history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [ship.id, portId]);

  useEffect(() => {
    const timer = setInterval(() => {
        setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const locationHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

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

    // Reverse history to process from oldest to newest
    const chronologicalHistory = [...history].reverse();

    chronologicalHistory.forEach(event => {
      if (event.eventType !== MovementEventType.BERTH_ASSIGNMENT) return;

      const from = event.details.fromBerthNames?.join(' & ') || 'Unassigned';
      const to = event.details.berthNames?.join(' & ') || 'Unassigned';

      if (from !== to) {
        // Handle departure from the 'from' location
        if (from !== 'Unassigned' && stays[from]) {
          stays[from].departure = event.timestamp;
          stays[from].durationMs = new Date(event.timestamp).getTime() - new Date(stays[from].arrival).getTime();
          // Capture pilot from the event that signifies departure
          stays[from].pilotOnDeparture = event.details.pilotId ? userMap.get(event.details.pilotId) || 'Unknown' : null;
          completedStays.push(stays[from]);
          delete stays[from];
        }
        // Handle arrival at the 'to' location
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

    // Add any ongoing stays
    Object.values(stays).forEach(ongoingStay => {
      ongoingStay.durationMs = now.getTime() - new Date(ongoingStay.arrival).getTime();
      completedStays.push(ongoingStay);
    });
    
    // Sort from most recent to oldest
    return completedStays.sort((a, b) => new Date(b.arrival).getTime() - new Date(a.arrival).getTime());

  }, [history, now, userMap]);
  
  const historyByTrip = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const grouped: { [tripId: string]: ShipMovement[] } = {};
    history.forEach(movement => {
      const tripId = movement.tripId || 'unknown-trip';
      if (!grouped[tripId]) {
        grouped[tripId] = [];
      }
      grouped[tripId].push(movement);
    });

    return Object.entries(grouped)
      .map(([tripId, movements]) => ({
        tripId,
        movements,
        // Find the latest timestamp in the group to sort the groups themselves
        latestTimestamp: movements.reduce((latest, mov) => 
          new Date(mov.timestamp) > new Date(latest) ? mov.timestamp : latest, movements[0].timestamp)
      }))
      .sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
  }, [history]);

  const handlePopOut = () => {
    const newWindow = window.open('', '_blank', 'width=1024,height=768,scrollbars=yes,resizable=yes');
    if (newWindow && contentRef.current) {
        const headContent = document.head.innerHTML;
        const contentHtml = contentRef.current.innerHTML;

        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <title>History: ${ship.name}</title>
                    ${headContent}
                </head>
                <body class="bg-gray-800 text-gray-200 p-6">
                    <h2 class="text-2xl font-bold mb-4 pb-4 border-b border-gray-700 text-white">Movement History: ${ship.name}</h2>
                    <div class="overflow-y-auto">
                        ${contentHtml}
                    </div>
                </body>
            </html>
        `);
        newWindow.document.close();
        onClose();
    }
  };

  const handleExportCSV = () => {
    log(InteractionEventType.DATA_EXPORT, {
        action: 'Export Ship History CSV',
        targetId: ship.id,
        value: ship.name,
    });
    const dataToExport = history.map(item => {
        let durationText = '';
        const itemIndex = history.indexOf(item);
        if (itemIndex === 0 && ship.currentTripId === item.tripId) {
            const durationMs = now.getTime() - new Date(item.timestamp).getTime();
            durationText = `(Current) ${formatDuration(durationMs)}`;
        } else if (itemIndex > 0) {
            const prevEvent = history[itemIndex - 1];
            const durationMs = new Date(prevEvent.timestamp).getTime() - new Date(item.timestamp).getTime();
            if (durationMs > 0) {
                durationText = formatDuration(durationMs);
            }
        }
        return {
            'Stopover ID': item.tripId,
            'Timestamp': new Date(item.timestamp).toLocaleString(),
            'Event Type': item.eventType,
            'Details': item.details.message,
            'Assigned Pilot': item.details.pilotId ? userMap.get(item.details.pilotId) || 'Unknown' : 'N/A',
            'Duration in State': durationText,
        }
    });
     downloadCSV(dataToExport, `ship-history-${ship.name.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPDF = () => {
    if (!selectedPort) {
      toast.error("Port information is not available for PDF export.");
      return;
    }
    log(InteractionEventType.DATA_EXPORT, {
        action: 'Export Ship History PDF',
        targetId: ship.id,
        value: ship.name,
    });

    const doc = new jsPDF();
    let finalY = 0;

    addHeaderWithLogo(doc, selectedPort, `Movement History: ${ship.name}`);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`IMO: ${ship.imo}`, 14, 30);
    finalY = 35;

    // --- Location Summary Table ---
    if (locationHistory.length > 0) {
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Location Summary']],
            body: [],
            theme: 'plain',
            styles: { fontStyle: 'bold', fontSize: 12 }
        });
        const locationColumns = ["Location", "Arrival", "Departure", "Duration", "Pilot (Arr)", "Pilot (Dep)"];
        const locationRows = locationHistory.map(stay => [
            stay.location,
            stay.arrival ? new Date(stay.arrival).toLocaleString() : 'N/A',
            stay.departure ? new Date(stay.departure).toLocaleString() : 'Present',
            stay.durationMs !== null ? formatDuration(stay.durationMs) : '',
            stay.pilotOnArrival || 'N/A',
            stay.pilotOnDeparture || (stay.departure ? 'N/A' : '')
        ]);
        autoTable(doc, {
            head: [locationColumns],
            body: locationRows,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    // --- Detailed Movement Log by Trip ---
    if (historyByTrip.length > 0) {
        autoTable(doc, {
            startY: finalY + 10,
            head: [['Detailed Movement Log']],
            body: [],
            theme: 'plain',
            styles: { fontStyle: 'bold', fontSize: 12 }
        });
        finalY = (doc as any).lastAutoTable.finalY;

        const movementColumns = ["Timestamp", "Event", "Details", "Pilot", "Duration in State"];
        historyByTrip.forEach(({ tripId, movements }) => {
            // Add a header for the trip
            autoTable(doc, {
                startY: finalY + 2,
                head: [[{ content: `Stopover ID: ${tripId}`, styles: { fillColor: [75, 85, 99], fontStyle: 'bold', fontSize: 10 } }]],
                body: [],
                theme: 'plain'
            });

            const chronologicalMovements = [...movements].reverse(); // Oldest to newest for this trip

            const movementRows = chronologicalMovements.map((item, index) => {
                let durationText = '—';
                if (index < chronologicalMovements.length - 1) {
                    const nextEvent = chronologicalMovements[index + 1];
                    const durationMs = new Date(nextEvent.timestamp).getTime() - new Date(item.timestamp).getTime();
                    durationText = formatDuration(durationMs);
                } else if (ship.currentTripId === tripId) {
                    const durationMs = now.getTime() - new Date(item.timestamp).getTime();
                    durationText = `(Current) ${formatDuration(durationMs)}`;
                }
                const pilotName = item.details.pilotId ? userMap.get(item.details.pilotId) || 'Unknown' : 'N/A';
                return [
                    new Date(item.timestamp).toLocaleString(),
                    item.eventType,
                    item.details.message,
                    pilotName,
                    durationText
                ];
            });

            autoTable(doc, {
                head: [movementColumns],
                body: movementRows,
                theme: 'striped',
                headStyles: { fillColor: [96, 108, 129] },
                styles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 35 } }
            });
            finalY = (doc as any).lastAutoTable.finalY;
        });
    }

    doc.save(`ship-history-${ship.name.replace(/\s+/g, '_')}-${ship.imo}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-5xl border border-gray-700 flex flex-col max-h-full">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-2xl font-bold">Movement History: {ship.name}</h2>
            <div className="flex items-center gap-2">
                <button onClick={handlePopOut} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" title="Open in new window">
                    <ExternalLinkIcon className="w-5 h-5" />
                </button>
                <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto pr-2 space-y-8">
          <div>
            <h3 className="text-xl font-bold mb-3 text-white">Location Summary</h3>
             <div className="overflow-y-auto max-h-64">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Location</th>
                            <th className="px-4 py-2">Arrival</th>
                            <th className="px-4 py-2">Pilot on Arrival</th>
                            <th className="px-4 py-2">Departure</th>
                            <th className="px-4 py-2">Pilot on Departure</th>
                            <th className="px-4 py-2">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {locationHistory.map((stay, index) => (
                            <tr key={`${stay.location}-${index}`} className="hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-medium">{stay.location}</td>
                                <td className="px-4 py-2">
                                    {stay.arrival && !isNaN(new Date(stay.arrival).getTime()) 
                                        ? new Date(stay.arrival).toLocaleString() 
                                        : 'Invalid date'}
                                </td>
                                <td className="px-4 py-2">
                                    {stay.pilotOnArrival ? (
                                        <div className="flex items-center gap-2">
                                            <PilotIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span>{stay.pilotOnArrival}</span>
                                        </div>
                                    ) : (
                                        'N/A'
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    {stay.departure && !isNaN(new Date(stay.departure).getTime()) 
                                        ? new Date(stay.departure).toLocaleString() 
                                        : <span className="text-green-400 font-semibold">Present</span>}
                                </td>
                                 <td className="px-4 py-2">
                                    {stay.pilotOnDeparture ? (
                                        <div className="flex items-center gap-2">
                                            <PilotIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span>{stay.pilotOnDeparture}</span>
                                        </div>
                                    ) : (
                                       stay.departure ? 'N/A' : ''
                                    )}
                                </td>
                                <td className="px-4 py-2">
                                    {stay.durationMs !== null ? formatDuration(stay.durationMs) : ''}
                                </td>
                            </tr>
                        ))}
                        {locationHistory.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-4 text-gray-500">No berthing history found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-3 text-white">Detailed Movement Log</h3>
             {isLoading ? (
                <p>Loading history...</p>
            ) : historyByTrip.length === 0 ? (
                <p>No history found for this vessel.</p>
            ) : (
                historyByTrip.map(({ tripId, movements }) => (
                     <div key={tripId} className="mb-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <h4 className="text-lg font-semibold mb-4 text-cyan-400 font-mono">Stopover ID: {tripId}</h4>
                        <ol className="relative border-l border-gray-600">
                            {movements.map((item, index) => {
                                let durationText = null;
                                if (index === 0 && ship.currentTripId === tripId) {
                                     const durationMs = now.getTime() - new Date(item.timestamp).getTime();
                                     durationText = `Current duration: ${formatDuration(durationMs)}`;
                                } else if (index > 0) {
                                    const prevEvent = movements[index - 1];
                                    const durationMs = new Date(prevEvent.timestamp).getTime() - new Date(item.timestamp).getTime();
                                     if (durationMs > 0) {
                                         durationText = `Duration in state: ${formatDuration(durationMs)}`;
                                     }
                                }

                                const isPilotChangeEvent = item.eventType === MovementEventType.PILOT_ASSIGNMENT;

                                return (
                                    <li key={item.id} className="mb-6 ml-6">
                                        <span className="absolute flex items-center justify-center w-6 h-6 bg-cyan-800 rounded-full -left-3 ring-8 ring-gray-800">
                                            <HistoryIcon className="w-3 h-3 text-cyan-300" />
                                        </span>
                                        <h3 className="flex items-center mb-1 text-lg font-semibold text-white">
                                            {item.eventType}
                                            {index === 0 && ship.currentTripId === tripId && <span className="bg-cyan-600 text-cyan-100 text-sm font-medium mr-2 px-2.5 py-0.5 rounded ml-3">Latest</span>}
                                        </h3>
                                        <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                                            {item.timestamp && !isNaN(new Date(item.timestamp).getTime())
                                                ? new Date(item.timestamp).toLocaleString()
                                                : 'Invalid date'}
                                        </time>
                                        
                                        {item.eventType === MovementEventType.STATUS_CHANGE && item.details.fromStatus && item.details.status ? (
                                            <p className="mb-2 text-base font-normal text-gray-300">
                                                Status changed from <span className="font-semibold text-yellow-400">{item.details.fromStatus}</span> to <span className="font-semibold text-green-400">{item.details.status}</span>.
                                            </p>
                                        ) : (
                                            <p className="mb-2 text-base font-normal text-gray-300">{item.details.message}</p>
                                        )}
                                        
                                        {item.details.pilotId && !isPilotChangeEvent && (
                                            <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                                                <PilotIcon className="w-4 h-4 flex-shrink-0" />
                                                Pilot on duty: <span className="font-semibold text-gray-200">{userMap.get(item.details.pilotId) || 'Unknown'}</span>
                                            </p>
                                        )}
                                        {durationText && (
                                            <p className="text-sm text-cyan-400 mt-1">{durationText}</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                     </div>
                ))
            )}
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-700 flex-shrink-0">
          {canExport ? (
            <div className="flex items-center gap-2">
                <button
                    onClick={handleExportPDF}
                    className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition-colors text-sm flex items-center gap-2"
                >
                    <PDFIcon className="w-4 h-4" />
                    Export as PDF
                </button>
                <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                >
                    <DownloadIcon className="w-4 h-4" />
                    Export as CSV
                </button>
            </div>
          ) : (
            <div></div> // Placeholder to keep the close button on the right
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ShipHistoryModal;