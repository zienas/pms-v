import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ShipIcon from './icons/ShipIcon';
import { toast } from 'react-hot-toast';

const ForcePasswordChangeModal: React.FC = () => {
    const { currentUser, updateOwnPassword, logout } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await updateOwnPassword(newPassword);
            // The modal will disappear automatically because isPasswordChangeRequired will become false
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            toast.error('Failed to update password.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLogout = () => {
        logout();
    }

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[100] p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                <div className="text-center">
                    <ShipIcon className="w-12 h-12 mx-auto text-cyan-400" />
                    <h2 className="mt-4 text-2xl font-bold text-white">Change Your Password</h2>
                    <p className="mt-2 text-sm text-gray-400">
                        For security, you must change your temporary password before proceeding.
                    </p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="newPassword"  className="block text-sm font-medium text-gray-300">New Password</label>
                        <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
                            placeholder="Enter new password"
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-300">Confirm New Password</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-md"
                            placeholder="Confirm new password"
                        />
                    </div>
                    
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <div>
                        <button type="submit" disabled={isLoading} data-logging-handler="true" className="group relative w-full flex justify-center py-2 px-4 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-500">
                            {isLoading ? 'Saving...' : 'Set New Password'}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-4">
                    <button onClick={handleLogout} data-logging-handler="true" className="text-sm text-gray-500 hover:text-gray-300">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForcePasswordChangeModal;