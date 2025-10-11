import React from 'react';
import type { Port, Berth } from '../types';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/SortIcon';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import { usePort } from '../context/PortContext';

interface PortManagementProps {
    ports: Port[];
    selectedPort: Port | null;
    onSelectPort: (port: Port) => void;
    onDeletePort: (portId: string) => void;
}

const PortManagement: React.FC<PortManagementProps> = ({ 
    ports, 
    selectedPort,
    onSelectPort,
    onDeletePort, 
}) => {
    const { allBerths, openPortFormModal, openBerthFormModal, deleteBerth } = usePort();
    
    const berthsForSelectedPort = selectedPort ? allBerths.filter(b => b.portId === selectedPort.id) : [];
    const { items: sortedBerths, requestSort, sortConfig } = useSortableData<Berth>(berthsForSelectedPort, { key: 'name', direction: 'ascending' });
    
    const getSortDirectionFor = (key: keyof Berth) => {
        if (!sortConfig) return undefined;
        return sortConfig.key === key ? sortConfig.direction : undefined;
    };


    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col text-white">
            <h1 className="text-2xl font-bold mb-4">Port & Berth Management</h1>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
                {/* Ports List */}
                <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Ports</h2>
                        <button onClick={() => openPortFormModal(null)} className="px-3 py-1 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm">Add Port</button>
                    </div>
                    <ul className="space-y-2 overflow-y-auto">
                        {ports.map(port => (
                            <li 
                                key={port.id} 
                                className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedPort?.id === port.id ? 'bg-cyan-500/20' : 'hover:bg-gray-700'}`}
                                onClick={() => onSelectPort(port)}
                            >
                                <span className="font-medium">{port.name}</span>
                                <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                     <button onClick={(e) => { e.stopPropagation(); openPortFormModal(port); }} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit Port">
                                        <EditIcon className="h-4 w-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeletePort(port.id); }} className="p-1 text-gray-300 hover:text-red-500" title="Delete Port">
                                        <DeleteIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Berths List */}
                <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg flex flex-col">
                    {selectedPort ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold truncate">Berths for {selectedPort.name}</h2>
                                <button onClick={() => openBerthFormModal(null)} className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap">Add Berth</button>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-sm text-left text-gray-300 min-w-[500px]">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3"><button onClick={() => requestSort('name')} className="flex items-center gap-1 hover:text-white">Name <SortIcon direction={getSortDirectionFor('name')} /></button></th>
                                            <th className="px-4 py-3"><button onClick={() => requestSort('type')} className="flex items-center gap-1 hover:text-white">Type <SortIcon direction={getSortDirectionFor('type')} /></button></th>
                                            <th className="px-4 py-3"><button onClick={() => requestSort('maxLength')} className="flex items-center gap-1 hover:text-white">Length <SortIcon direction={getSortDirectionFor('maxLength')} /></button></th>
                                            <th className="px-4 py-3"><button onClick={() => requestSort('maxDraft')} className="flex items-center gap-1 hover:text-white">Draft <SortIcon direction={getSortDirectionFor('maxDraft')} /></button></th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {sortedBerths.map(berth => (
                                            <tr key={berth.id} className="hover:bg-gray-700/50 group">
                                                <td className="px-4 py-2 font-medium">{berth.name}</td>
                                                <td className="px-4 py-2">{berth.type}</td>
                                                <td className="px-4 py-2">{berth.maxLength}m</td>
                                                <td className="px-4 py-2">{berth.maxDraft}m</td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                                                        <button onClick={() => openBerthFormModal(berth)} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit Berth">
                                                            <EditIcon className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => deleteBerth(berth.portId, berth.id)} className="p-1 text-gray-300 hover:text-red-500" title="Delete Berth">
                                                            <DeleteIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>{ports.length > 0 ? 'Select a port to manage its berths.' : 'Add a port to begin management.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PortManagement;