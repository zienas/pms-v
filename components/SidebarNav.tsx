import React from 'react';
import type { View } from '../types';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import DashboardIcon from './icons/DashboardIcon';
import ShipIcon from './icons/ShipIcon';
import AnchorIcon from './icons/AnchorIcon';
import WarningIcon from './icons/WarningIcon';
import SettingsIcon from './icons/SettingsIcon';
import CogIcon from './icons/CogIcon';
import UsersIcon from './icons/UsersIcon';
import CloseIcon from './icons/CloseIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import RouteIcon from './icons/RouteIcon';

interface SidebarNavProps {
    activeView: View;
    setActiveView: (view: View) => void;
    alertCount: number;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const icons: { [key: string]: React.ElementType } = {
    dashboard: DashboardIcon,
    vessels: ShipIcon,
    berths: AnchorIcon,
    alerts: WarningIcon,
    trips: RouteIcon,
    'vessel-analytics': ChartBarIcon,
    settings: SettingsIcon,
    management: CogIcon,
    users: UsersIcon,
};

interface NavItemProps {
    view: View;
    label: string;
    count?: number;
    activeView: View;
    onViewChange: (view: View) => void;
}

const NavItem: React.FC<NavItemProps> = ({ view, label, count, activeView, onViewChange }) => {
    const isActive = activeView === view;
    const baseClasses = "flex items-center w-full p-3 my-1 rounded-lg transition-colors duration-200";
    const activeClasses = "bg-cyan-500/20 text-cyan-300";
    const inactiveClasses = "text-gray-400 hover:bg-gray-700 hover:text-white";
    const IconComponent = icons[view];

    return (
        <li>
            <button
                onClick={() => onViewChange(view)}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                aria-current={isActive ? 'page' : undefined}
            >
                <IconComponent className="w-6 h-6" />
                <span className="ml-3 font-medium">{label}</span>
                {count !== undefined && (
                     <span className={`ml-auto text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ${
                        count > 0 && view === 'alerts'
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-600 text-gray-200'
                     }`}>{count}</span>
                )}
            </button>
        </li>
    );
};

const SidebarNav: React.FC<SidebarNavProps> = ({ activeView, setActiveView, alertCount, isOpen, setIsOpen }) => {
    const { currentUser } = useAuth();
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const canAccessSettings = [UserRole.ADMIN, UserRole.CAPTAIN, UserRole.OPERATOR].includes(currentUser.role);

    const handleViewChange = (view: View) => {
        setActiveView(view);
        setIsOpen(false); // Close sidebar on selection in mobile
    };

    return (
        <nav className={`fixed top-0 left-0 h-full w-64 bg-gray-900 p-4 border-r border-gray-700 flex flex-col z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Main Menu</h2>
                <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-white md:hidden" aria-label="Close menu">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
            <ul className="flex-1">
                <NavItem view="dashboard" label="Dashboard" activeView={activeView} onViewChange={handleViewChange} />
                <NavItem view="vessels" label="Vessels" activeView={activeView} onViewChange={handleViewChange} />
                <NavItem view="berths" label="Berths" activeView={activeView} onViewChange={handleViewChange} />
                <NavItem view="alerts" label="Alerts" count={alertCount} activeView={activeView} onViewChange={handleViewChange} />
                <NavItem view="trips" label="Trips" activeView={activeView} onViewChange={handleViewChange} />
                <NavItem view="vessel-analytics" label="Vessel Analytics" activeView={activeView} onViewChange={handleViewChange} />
                
                <div className="my-4 border-t border-gray-700"></div>
                
                {canAccessSettings && <NavItem view="settings" label="Settings" activeView={activeView} onViewChange={handleViewChange} />}
                
                {isAdmin && (
                    <>
                        <NavItem view="management" label="Manage Ports" activeView={activeView} onViewChange={handleViewChange} />
                        <NavItem view="users" label="Manage Users" activeView={activeView} onViewChange={handleViewChange} />
                    </>
                )}
            </ul>
            <div className="mt-auto text-center text-xs text-gray-500">
                <p>&copy; {new Date().getFullYear()} Port Authority</p>
                <p>Version 2.1</p>
            </div>
        </nav>
    );
};

export default SidebarNav;