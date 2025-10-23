import React, { useState, useEffect, useMemo } from 'react';
import type { User, LoginHistoryEntry } from '../types';
import { UserRole, InteractionEventType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSortableData } from '../hooks/useSortableData';
import SortIcon from '../components/icons/SortIcon';
import * as api from '../services/api';
import { downloadCSV } from '../utils/export';
import DownloadIcon from '../components/icons/DownloadIcon';
import EditIcon from '../components/icons/EditIcon';
import DeleteIcon from '../components/icons/DeleteIcon';
import { formatDuration } from '../utils/formatters';
import { usePort } from '../context/PortContext';
import { useLogger } from '../context/InteractionLoggerContext';

const UserManagement: React.FC = () => {
    const { currentUser, users, deleteUser } = useAuth();
    const { state, actions } = usePort();
    const { log } = useLogger();
    const { ports } = state;
    const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
    
    const { items: sortedHistory, requestSort: requestHistorySort, sortConfig: historySortConfig } = useSortableData<LoginHistoryEntry>(loginHistory, { key: 'timestamp', direction: 'descending' });
    const { items: sortedUsers, requestSort: requestUserSort, sortConfig: userSortConfig } = useSortableData<User>(users, { key: 'name', direction: 'ascending' });
    
    const usersToDisplay = useMemo(() => {
        if (currentUser?.role === UserRole.ADMIN) {
            return sortedUsers;
        }
        if (currentUser?.role === UserRole.SUPERVISOR) {
            // Supervisors can manage Operators, Agents, and Pilots.
            const manageableRoles = [UserRole.OPERATOR, UserRole.AGENT, UserRole.PILOT];
            return sortedUsers.filter(user => manageableRoles.includes(user.role));
        }
        return [];
    }, [sortedUsers, currentUser?.role]);

    useEffect(() => {
        api.getLoginHistory().then(setLoginHistory).catch(err => console.error("Failed to fetch login history", err));
    }, []);

    const getHistorySortDirectionFor = (key: keyof LoginHistoryEntry) => historySortConfig?.key === key ? historySortConfig.direction : undefined;
    const getUserSortDirectionFor = (key: keyof User) => userSortConfig?.key === key ? userSortConfig.direction : undefined;
    
    const handleExport = () => {
        const dataToExport = sortedHistory.map(entry => ({
            'User Name': entry.userName, 'Port': entry.portName,
            'Login Time': new Date(entry.timestamp).toLocaleString(),
            'Logout Time': entry.logoutTimestamp ? new Date(entry.logoutTimestamp).toLocaleString() : 'Active',
            'Session Duration': entry.logoutTimestamp ? formatDuration(new Date(entry.logoutTimestamp).getTime() - new Date(entry.timestamp).getTime()) : 'Active',
        }));
        if (dataToExport.length === 0) { alert(`No login history found.`); return; }
        downloadCSV(dataToExport, `user_login_history.csv`);
    };

    const handleDeleteUser = (user: User) => {
        log(InteractionEventType.BUTTON_CLICK, {
            action: 'Delete User',
            targetId: user.id,
            value: user.name,
        });
        deleteUser(user.id);
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-3 sm:p-4 h-full flex flex-col text-white space-y-6">
            <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <button onClick={() => actions.openModal({type: 'userForm', user: null})} data-logging-handler="true" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">Add User</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300 min-w-[800px]">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="px-4 py-3">
                                    <button onClick={() => requestUserSort('name')} className="flex items-center gap-1 hover:text-white">
                                        Name <SortIcon direction={getUserSortDirectionFor('name')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3">
                                    <button onClick={() => requestUserSort('email')} className="flex items-center gap-1 hover:text-white">
                                        Email <SortIcon direction={getUserSortDirectionFor('email')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3">Contact Info</th>
                                <th className="px-4 py-3">
                                    <button onClick={() => requestUserSort('role')} className="flex items-center gap-1 hover:text-white">
                                        Role <SortIcon direction={getUserSortDirectionFor('role')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3">
                                    <button onClick={() => requestUserSort('portId')} className="flex items-center gap-1 hover:text-white">
                                        Assigned Port <SortIcon direction={getUserSortDirectionFor('portId')} />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {usersToDisplay.map(user => (
                                <tr key={user.id} className="hover:bg-gray-800/50 group">
                                    <td className="px-4 py-3 font-medium">{user.name}</td>
                                    <td className="px-4 py-3">{user.email || '—'}</td>
                                    <td className="px-4 py-3">{user.phone || user.gsm || '—'}</td>
                                    <td className="px-4 py-3">{user.role}</td>
                                    <td className="px-4 py-3">{user.portId ? (ports.find(p => p.id === user.portId)?.name || 'N/A') : 'Admin'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="opacity-0 group-hover:opacity-100 flex justify-end gap-2">
                                            <button onClick={() => { log(InteractionEventType.MODAL_OPEN, { action: 'Open UserForm (Edit)', targetId: user.id }); actions.openModal({ type: 'userForm', user });}} data-logging-handler="true" className="p-1 text-gray-300 hover:text-cyan-400" title="Edit"><EditIcon className="h-4 w-4" /></button>
                                            <button onClick={() => handleDeleteUser(user)} data-logging-handler="true" className="p-1 text-gray-300 hover:text-red-500" title="Delete"><DeleteIcon className="h-4 w-4" /></button>
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
                    <button onClick={handleExport} className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Export</button>
                </div>
                 <div className="overflow-x-auto flex-1">
                     <table className="w-full text-sm text-left text-gray-300 min-w-[600px]">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                            <tr>
                                {['userName', 'portName', 'timestamp', 'logoutTimestamp'].map(key => (
                                    <th className="px-4 py-3" key={key}><button onClick={() => requestHistorySort(key as keyof LoginHistoryEntry)} className="flex items-center gap-1 hover:text-white capitalize">{key.replace('Name','').replace('timestamp',' Time')} <SortIcon direction={getHistorySortDirectionFor(key as keyof LoginHistoryEntry)} /></button></th>
                                ))}
                                <th className="px-4 py-3">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                           {sortedHistory.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium">{entry.userName}</td>
                                    <td className="px-4 py-3">{entry.portName}</td>
                                    <td className="px-4 py-3">{new Date(entry.timestamp).toLocaleString()}</td>
                                    <td className="px-4 py-3">{entry.logoutTimestamp ? new Date(entry.logoutTimestamp).toLocaleString() : <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-300">Active</span>}</td>
                                    <td className="px-4 py-3">{entry.logoutTimestamp ? formatDuration(new Date(entry.logoutTimestamp).getTime() - new Date(entry.timestamp).getTime()) : '—'}</td>
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