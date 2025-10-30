import React, { useMemo } from 'react';
import MenuIcon from './icons/MenuIcon';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { UserRole, InteractionEventType } from '../types';
import { DEFAULT_APP_LOGO_PNG } from '../utils/pdfUtils';
import { useLogger } from '../context/InteractionLoggerContext';
import { useSettings } from '../context/SettingsContext';

interface HeaderProps {
    onMenuClick: () => void;
    isSidebarOpen: boolean;
}

const AisStatusIndicator: React.FC = () => {
    const { aisSource, isAisSimulationEnabled } = useSettings();

    const { statusText, dotColor, titleText } = useMemo(() => {
        if (aisSource === 'simulator') {
            if (isAisSimulationEnabled) {
                return {
                    statusText: 'AIS: Simulating',
                    dotColor: 'bg-green-500 animate-pulse',
                    titleText: 'Internal AIS simulator is running.'
                };
            } else {
                return {
                    statusText: 'AIS: Inactive',
                    dotColor: 'bg-gray-500',
                    titleText: 'Internal AIS simulator is paused. Enable it in Settings.'
                };
            }
        } else {
            return {
                statusText: 'AIS: Live Feed',
                dotColor: 'bg-yellow-500',
                titleText: `Attempting to connect to live AIS feed (${aisSource}). Go to Settings to change source.`
            };
        }
    }, [aisSource, isAisSimulationEnabled]);

    return (
        <div className="hidden sm:flex items-center gap-2 p-2 rounded-md bg-gray-800" title={titleText}>
            <span className={`w-3 h-3 rounded-full ${dotColor}`}></span>
            <span className="text-xs text-gray-300 font-medium">{statusText}</span>
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ onMenuClick, isSidebarOpen }) => {
  const { currentUser, logout } = useAuth();
  const { state, actions } = usePort();
  const { log } = useLogger();
  const { selectedPort, accessiblePorts, selectedPortId } = state;
  const showPortSelector = currentUser?.role === UserRole.ADMIN && accessiblePorts.length > 1;

  if (!currentUser) return null;
  
  const handleLogout = () => {
      logout();
  };

  return (
    <header className="flex items-center justify-between p-3 sm:p-4 bg-gray-900 border-b border-gray-700 shadow-md flex-shrink-0">
      <div className="flex items-center overflow-hidden">
        <button 
            onClick={onMenuClick} 
            className={`p-2 mr-2 text-gray-300 hover:text-white ${isSidebarOpen ? 'md:hidden' : ''}`}
            aria-label="Open menu"
        >
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
        <AisStatusIndicator />
        {showPortSelector && (
            <div className="hidden sm:block">
                <label htmlFor="port-select" className="sr-only">Select Port</label>
                <select
                    id="port-select"
                    value={selectedPortId || ''}
                    onChange={(e) => {
                        log(InteractionEventType.FILTER_APPLIED, { 
                            action: 'Change Port', 
                            value: e.target.options[e.target.selectedIndex].text,
                            message: `User changed active port to ${e.target.options[e.target.selectedIndex].text}`
                        });
                        actions.setSelectedPortId(e.target.value);
                    }}
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
         <button onClick={handleLogout} data-logging-handler="true" className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors" aria-label="Logout">Logout</button>
      </div>
    </header>
  );
};

export default Header;