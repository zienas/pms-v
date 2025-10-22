import React from 'react';
import MenuIcon from './icons/MenuIcon';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { UserRole } from '../types';
import { DEFAULT_APP_LOGO_PNG } from '../utils/pdfUtils';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, logout } = useAuth();
  const { state, actions } = usePort();
  const { selectedPort, accessiblePorts, selectedPortId } = state;
  const showPortSelector = currentUser?.role === UserRole.ADMIN && accessiblePorts.length > 1;

  if (!currentUser) return null;

  return (
    <header className="flex items-center justify-between p-3 sm:p-4 bg-gray-900 border-b border-gray-700 shadow-md flex-shrink-0">
      <div className="flex items-center overflow-hidden">
        <button onClick={onMenuClick} className="p-2 mr-2 text-gray-300 hover:text-white md:hidden" aria-label="Open menu">
          <MenuIcon className="w-6 h-6" />
        </button>
        <img
            src={selectedPort?.logoImage || DEFAULT_APP_LOGO_PNG}
            alt={selectedPort ? `${selectedPort.name} logo` : 'Port logo'}
            className="w-8 h-8 object-contain mr-3 rounded-md bg-gray-700/50 p-1 flex-shrink-0"
        />
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wider truncate">
            {selectedPort?.name || (accessiblePorts.length > 0 ? "Select a Port" : "No Ports Available")}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {showPortSelector && (
            <div className="hidden sm:block">
                <label htmlFor="port-select" className="sr-only">Select Port</label>
                <select
                    id="port-select"
                    value={selectedPortId || ''}
                    onChange={(e) => actions.setSelectedPortId(e.target.value)}
                    className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                    {accessiblePorts.map(port => (
                        <option key={port.id} value={port.id}>{port.name}</option>
                    ))}
                </select>
            </div>
        )}
         <div className="text-right">
            <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-cyan-400 hidden sm:block">{currentUser.role}</p>
         </div>
         {/* FIX: The `logout` function requires an optional string, not a MouseEvent. It must be wrapped in an arrow function. */}
         <button onClick={() => logout()} className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors" aria-label="Logout">Logout</button>
      </div>
    </header>
  );
};

export default Header;