
import React from 'react';
import ShipIcon from './icons/ShipIcon';
import MenuIcon from './icons/MenuIcon';
import { useAuth } from '../context/AuthContext';
import type { Port } from '../types';

interface HeaderProps {
    portName: string;
    ports: Port[];
    selectedPortId: string | null;
    onPortChange: (portId: string) => void;
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ portName, ports, selectedPortId, onPortChange, onMenuClick }) => {
  const { currentUser, logout } = useAuth();

  if (!currentUser) return null;

  return (
    <header className="flex items-center justify-between p-3 sm:p-4 bg-gray-900 border-b border-gray-700 shadow-md flex-shrink-0">
      <div className="flex items-center">
        <button onClick={onMenuClick} className="p-2 mr-2 text-gray-300 hover:text-white md:hidden" aria-label="Open menu">
          <MenuIcon className="w-6 h-6" />
        </button>
        <ShipIcon className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 mr-2 sm:mr-3" />
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wider truncate">{portName}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {ports.length > 1 && (
            <div className="hidden sm:block">
                <label htmlFor="port-select" className="sr-only">Select Port</label>
                <select
                    id="port-select"
                    value={selectedPortId || ''}
                    onChange={(e) => onPortChange(e.target.value)}
                    className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                    {ports.map(port => (
                        <option key={port.id} value={port.id}>{port.name}</option>
                    ))}
                </select>
            </div>
        )}
         <div className="text-right">
            <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-cyan-400 hidden sm:block">{currentUser.role}</p>
         </div>
         <button
            onClick={logout}
            className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            aria-label="Logout"
         >
            Logout
         </button>
      </div>
    </header>
  );
};

export default Header;