import React, { useState, useMemo } from 'react';
import type { Port, Berth } from '../types';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import { usePort } from '../context/PortContext';
import { DEFAULT_APP_LOGO_PNG } from '../utils/logo';

const PortManagement: React.FC = () => {
    const { state, actions } = usePort();
    const { ports, allBerths } = state;
    
    // Local state for the selected port in this management view
    const [managingPort, setManagingPort] = useState<Port | null>(ports[0] || null);

    const berthsForSelectedPort = useMemo(() => managingPort ? allBerths.filter(b => b.portId === managingPort.id) : [], [managingPort, allBerths]);
    const { items: sortedBerths, requestSort, sortConfig } = useSortableData<Berth>(berthsForSelectedPort, { key: 'name', direction: 'ascending' });
    
    const getSortDirectionFor = (key: keyof Berth) => sortConfig?.key === key ? sortConfig.direction : undefined;

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col text-white">
            <h1 className="text-2xl font-bold mb-4">Port & Berth Management</h1>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 min-h-0">
                {/* Ports List */}
                <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Ports</h2>
                        <button onClick={() => actions.openModal({ type: 'portForm', port: null })} className="px-3 py-1 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 text-sm">Add Port</button>
                    </div>
                    <ul className="space-y-2 overflow-y-auto">
                        {ports.map(port => (
                            <li key={port.id} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${managingPort?.id === port.id ? 'bg-cyan-500/20' : 'hover:bg-gray-700'}`} onClick={() => setManagingPort(port)}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <img 
                                        src={port.logoImage || DEFAULT_APP_LOGO_PNG} 
                                        alt={`${port.name} logo`}
                                        className="w-8 h-8 object-contain rounded-md bg-gray-900/50 flex-shrink-0"
                                    />
                                    <span className="font-medium truncate">{port.name}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex gap-2 flex-shrink-0">
                                     <button onClick={(e) => { e.stopPropagation(); actions.openModal({ type: 'portForm', port }); }} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit Port"><EditIcon className="h-4 w-4" /></button>
                                     <button onClick={(e) => { e.stopPropagation(); actions.deletePort(port.id); }} className="p-1 text-gray-300 hover:text-red-500" title="Delete Port"><DeleteIcon className="h-4 w-4" /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Berths List */}
                <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg flex flex-col">
                    {managingPort ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold truncate">Berths for {managingPort.name}</h2>
                                <button onClick={() => actions.openModal({ type: 'berthForm', port: managingPort, berth: null })} className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap">Add Berth</button>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-sm text-left text-gray-300 min-w-[500px]">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                                        <tr>
                                            <th><button onClick={() => requestSort('name')} className="flex items-center gap-1 hover:text-white px-4 py-3">Name <SortIcon direction={getSortDirectionFor('name')} /></button></th>
                                            <th><button onClick={() => requestSort('type')} className="flex items-center gap-1 hover:text-white px-4 py-3">Type <SortIcon direction={getSortDirectionFor('type')} /></button></th>
                                            <th><button onClick={() => requestSort('maxLength')} className="flex items-center gap-1 hover:text-white px-4 py-3">Length <SortIcon direction={getSortDirectionFor('maxLength')} /></button></th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {sortedBerths.map(berth => (
                                            <tr key={berth.id} className="hover:bg-gray-700/50 group">
                                                <td className="px-4 py-2 font-medium">{berth.name}</td>
                                                <td className="px-4 py-2">{berth.type}</td>
                                                <td className="px-4 py-2">{berth.maxLength}m</td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                                                        <button onClick={() => actions.openModal({ type: 'berthForm', port: managingPort, berth })} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit Berth"><EditIcon className="h-4 w-4" /></button>
                                                        <button onClick={() => actions.deleteBerth(berth.portId, berth.id)} className="p-1 text-gray-300 hover:text-red-500" title="Delete Berth"><DeleteIcon className="h-4 w-4" /></button>
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