import React, { useState, useMemo } from 'react';
import type { ShipMovement } from '../types';
import { usePort } from '../context/PortContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PDFIcon from '../components/icons/PDFIcon';
import { DEFAULT_APP_LOGO_PNG } from '../utils/logo';

const SystemLogs: React.FC = () => {
  const { state } = usePort();
  const { movements, ships, selectedPort } = state;

  const [filter, setFilter] = useState('');

  const shipMap = useMemo(() => new Map(ships.map(s => [s.id, s])), [ships]);

  const filteredLogs = useMemo(() => {
    return movements.filter(log => {
      const shipName = shipMap.get(log.shipId)?.name || '';
      const lowerCaseFilter = filter.toLowerCase();
      return (
        shipName.toLowerCase().includes(lowerCaseFilter) ||
        log.eventType.toLowerCase().includes(lowerCaseFilter) ||
        log.details.message.toLowerCase().includes(lowerCaseFilter) ||
        log.tripId.toLowerCase().includes(lowerCaseFilter)
      );
    });
  }, [movements, filter, shipMap]);

  const { items: sortedLogs, requestSort, sortConfig } = useSortableData<ShipMovement>(filteredLogs, { key: 'timestamp', direction: 'descending' });
  const getSortDirectionFor = (key: keyof ShipMovement) => sortConfig?.key === key ? sortConfig.direction : undefined;

  const handleExportCSV = () => {
    if (!selectedPort) return;
    if (sortedLogs.length === 0) {
        toast.error('No log data to export.');
        return;
    }
    const dataToExport = sortedLogs.map(log => ({
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'Vessel Name': shipMap.get(log.shipId)?.name || 'N/A',
      'IMO': shipMap.get(log.shipId)?.imo || 'N/A',
      'Trip ID': log.tripId,
      'Event Type': log.eventType,
      'Details': log.details.message,
    }));
    downloadCSV(dataToExport, `system_logs_${selectedPort.name.replace(/\s+/g, '_')}.csv`);
  };

  const handleExportPDF = () => {
    if (!selectedPort) return;
    if (sortedLogs.length === 0) {
      toast.error('No log data to export.');
      return;
    }
  
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumns = ['Timestamp', 'Vessel', 'IMO', 'Trip ID', 'Event', 'Details'];
    const tableRows = sortedLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      shipMap.get(log.shipId)?.name || 'N/A',
      shipMap.get(log.shipId)?.imo || 'N/A',
      log.tripId ? log.tripId.split('-')[1] : '',
      log.eventType,
      log.details.message,
    ]);
  
    autoTable(doc, {
      head: [tableColumns], body: tableRows, theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 5: { cellWidth: 100 } }, // Give details column more space
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

        if (isCustomLogoValid) {
          try {
            doc.addImage(customLogo!, customLogoFormat!, marginLeft, 15, 20, 20);
            logoAdded = true;
          } catch (e) {
            console.warn('Failed to add custom port logo.', e);
          }
        }
        
        if (!logoAdded) {
          try {
            doc.addImage(DEFAULT_APP_LOGO_PNG, 'PNG', marginLeft, 15, 20, 20);
            logoAdded = true;
          } catch (e) {
            console.error('Failed to add default logo.', e);
          }
        }
  
        if (logoAdded) titleX += 22;
  
        doc.text("System Event Logs", titleX, 22);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(selectedPort.name, titleX, 29);
        doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - data.settings.margin.right, 29, { align: 'right' });
        doc.text(`Page ${doc.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
      },
      margin: { top: 38 }
    });
  
    doc.save(`system_logs_${selectedPort.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold text-white">System Event Logs</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={handleExportPDF} className="px-3 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm flex items-center gap-2">
            <PDFIcon className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={handleExportCSV} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by vessel, event, details, or trip ID..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
          <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase sticky top-0">
            <tr>
              <th className="px-4 py-3">
                <button onClick={() => requestSort('timestamp')} className="flex items-center gap-1 hover:text-white">
                  Timestamp <SortIcon direction={getSortDirectionFor('timestamp')} />
                </button>
              </th>
              <th className="px-4 py-3">Vessel</th>
              <th className="px-4 py-3">
                 <button onClick={() => requestSort('tripId')} className="flex items-center gap-1 hover:text-white">
                    Trip ID <SortIcon direction={getSortDirectionFor('tripId')} />
                </button>
              </th>
              <th className="px-4 py-3">
                <button onClick={() => requestSort('eventType')} className="flex items-center gap-1 hover:text-white">
                  Event Type <SortIcon direction={getSortDirectionFor('eventType')} />
                </button>
              </th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-white">{shipMap.get(log.shipId)?.name || 'Unknown Vessel'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.tripId.split('-')[1]}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">{log.eventType}</span>
                </td>
                <td className="px-4 py-3">{log.details.message}</td>
              </tr>
            ))}
             {sortedLogs.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                        {movements.length === 0 ? "No log entries available." : "No logs match your filter."}
                    </td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemLogs;