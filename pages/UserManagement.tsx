
import React, { useState, useEffect } from 'react';
import type { User, LoginHistoryEntry, Port } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/SortIcon';
import * as api from '../services/api';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import { formatDuration } from '../utils/formatters';
import { usePort } from '../context/PortContext';

interface UserManagementProps {
    allPorts: Port[];
}

const UserManagement: React.FC<UserManagementProps> = ({ allPorts }) => {
    const { users, deleteUser } = useAuth();
    const { openUserFormModal } = usePort();
    const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
    
    const { items: sortedHistory, requestSort, sortConfig } = useSortableData<LoginHistoryEntry>(loginHistory, { key: 'timestamp', direction: 'descending' });
    
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await api.getLoginHistory();
                setLoginHistory(history);
            } catch (error) {
                console.error("Failed to fetch login history", error);
            }
        };
        fetchHistory();
    }, []);

    const getSortDirectionFor = (key: keyof LoginHistoryEntry) => {
        if (!sortConfig) return undefined;
        return sortConfig.key === key ? sortConfig.direction : undefined;
    };
    
    const handleExport = () => {
        const dataToExport = sortedHistory
            .map(entry => {
                const duration = entry.logoutTimestamp 
                    ? formatDuration(new Date(entry.logoutTimestamp).getTime() - new Date(entry.timestamp).getTime())
                    : 'Active';

                return {
                    'User Name': entry.userName,
                    'Port': entry.portName,
                    'Login Time': entry.timestamp && !isNaN(new Date(entry.timestamp).getTime()) ? new Date(entry.timestamp).toLocaleString() : 'Invalid Date',
                    'Logout Time': entry.logoutTimestamp && !isNaN(new Date(entry.logoutTimestamp).getTime()) ? new Date(entry.logoutTimestamp).toLocaleString() : '',
                    'Session Duration': duration,
                };
            });
        
        if (dataToExport.length === 0) {
            alert(`No login history found.`);
            return;
        }

        downloadCSV(dataToExport, `user_login_history_all_ports.csv`);
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col text-white space-y-6">
            <div className="flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <button onClick={() => openUserFormModal(null)} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">
                        Add User
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300 min-w-[500px]">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Assigned Port</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-800/50 group">
                                    <td className="px-4 py-3 font-medium">{user.name}</td>
                                    <td className="px-4 py-3">{user.role}</td>
                                    <td className="px-4 py-3">{user.portId ? (allPorts.find(p => p.id === user.portId)?.name || user.portId) : 'N/A'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                                            <button onClick={() => openUserFormModal(user)} className="p-1 text-gray-300 hover:text-cyan-400" title="Edit User">
                                                <EditIcon className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => deleteUser(user.id)} className="p-1 text-gray-300 hover:text-red-500" title="Delete User">
                                                <DeleteIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold">User Login History</h2>
                    <button 
                        onClick={handleExport}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export
                    </button>
                </div>
                 <div className="overflow-x-auto flex-1">
                     <table className="w-full text-sm text-left text-gray-300 min-w-[600px]">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-3"><button onClick={() => requestSort('userName')} className="flex items-center gap-1 hover:text-white">User <SortIcon direction={getSortDirectionFor('userName')} /></button></th>
                                <th className="px-4 py-3"><button onClick={() => requestSort('portName')} className="flex items-center gap-1 hover:text-white">Port <SortIcon direction={getSortDirectionFor('portName')} /></button></th>
                                <th className="px-4 py-3"><button onClick={() => requestSort('timestamp')} className="flex items-center gap-1 hover:text-white">Login Time <SortIcon direction={getSortDirectionFor('timestamp')} /></button></th>
                                <th className="px-4 py-3"><button onClick={() => requestSort('logoutTimestamp')} className="flex items-center gap-1 hover:text-white">Logout Time <SortIcon direction={getSortDirectionFor('logoutTimestamp')} /></button></th>
                                <th className="px-4 py-3">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                           {sortedHistory.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium">{entry.userName}</td>
                                    <td className="px-4 py-3">{entry.portName}</td>
                                    <td className="px-4 py-3">
                                        {entry.timestamp && !isNaN(new Date(entry.timestamp).getTime())
                                            ? new Date(entry.timestamp).toLocaleString()
                                            : 'Invalid date'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {entry.logoutTimestamp ? (
                                            !isNaN(new Date(entry.logoutTimestamp).getTime())
                                                ? new Date(entry.logoutTimestamp).toLocaleString()
                                                : 'Invalid date'
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-300 border border-green-500">Active</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {entry.logoutTimestamp ? 
                                            formatDuration(new Date(entry.logoutTimestamp).getTime() - new Date(entry.timestamp).getTime())
                                            : '—'
                                        }
                                    </td>
                                </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
