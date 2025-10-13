import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import ShipIcon from '../components/icons/ShipIcon';
import * as api from '../services/api';
import type { Port, User } from '../types';
import { UserRole } from '../types';

const LoginPage: React.FC = () => {
    const { login, users } = useAuth();
    const [ports, setPorts] = useState<Port[]>([]);
    const [selectedPortId, setSelectedPortId] = useState('');
    const [selectedUserName, setSelectedUserName] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchPorts = async () => {
            try {
                const fetchedPorts = await api.getPorts();
                setPorts(fetchedPorts);
                if (fetchedPorts.length > 0) {
                    setSelectedPortId(fetchedPorts[0].id);
                }
            } catch (err) { console.error("Failed to fetch ports", err); }
        };
        fetchPorts();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!selectedPortId) return [];
        return users.filter(user => user.role === UserRole.ADMIN || user.portId === selectedPortId);
    }, [users, selectedPortId]);

    useEffect(() => {
        // Reset selected user if they are not in the filtered list
        if (selectedUserName && !filteredUsers.some(u => u.name === selectedUserName)) {
            setSelectedUserName('');
        }
    }, [filteredUsers, selectedUserName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        await login(selectedUserName, password, selectedPortId);
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                <div className="text-center">
                    <ShipIcon className="w-16 h-16 mx-auto text-cyan-400" />
                    <h2 className="mt-6 text-3xl font-extrabold text-white">Port Vessel Management System</h2>
                    <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="port" className="sr-only">Port</label>
                            <select id="port" name="port" required value={selectedPortId} onChange={e => setSelectedPortId(e.target.value)} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-t-md">
                                <option value="" disabled>-- Select a Port --</option>
                                {ports.map(port => <option key={port.id} value={port.id}>{port.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <select id="username" name="username" required value={selectedUserName} onChange={e => setSelectedUserName(e.target.value)} disabled={!selectedPortId} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm disabled:bg-gray-600">
                                <option value="" disabled>-- Select a User --</option>
                                {filteredUsers.map(user => <option key={user.id} value={user.name}>{user.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="password"  className="sr-only">Password</label>
                            <input id="password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-b-md" placeholder="Password (hint: password)" />
                        </div>
                    </div>
                    
                    <div>
                        <button type="submit" disabled={isLoading || !selectedUserName} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-500">
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
                 <div className="text-sm text-center mt-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset functionality is not yet implemented.'); }} className="font-medium text-cyan-400 hover:text-cyan-300">Forgot Password?</a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
