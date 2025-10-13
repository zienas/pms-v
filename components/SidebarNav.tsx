import React, { useMemo } from 'react';
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
import DocumentTextIcon from './icons/DocumentTextIcon';

interface SidebarNavProps {
    activeView: View;
    setActiveView: (view: View) => void;
    alertCount: number;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

interface NavItemConfig {
    view: View;
    label: string;
    icon: React.ElementType;
    count?: number;
    requiresAdmin?: boolean;
    requiresRoles?: UserRole[];
}

const NavItem: React.FC<{
    config: NavItemConfig;
    activeView: View;
    onViewChange: (view: View) => void;
}> = ({ config, activeView, onViewChange }) => {
    const isActive = activeView === config.view;
    const IconComponent = config.icon;
    return (
        <li>
            <button onClick={() => onViewChange(config.view)} className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors duration-200 ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} aria-current={isActive}>
                <IconComponent className="w-6 h-6" />
                <span className="ml-3 font-medium">{config.label}</span>
                {config.count !== undefined && (
                     <span className={`ml-auto text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center ${config.count > 0 && config.view === 'alerts' ? 'bg-red-500 text-white' : 'bg-gray-600'}`}>{config.count}</span>
                )}
            </button>
        </li>
    );
};

const SidebarNav: React.FC<SidebarNavProps> = ({ activeView, setActiveView, alertCount, isOpen, setIsOpen }) => {
    const { currentUser } = useAuth();

    const navItems: NavItemConfig[] = useMemo(() => [
        { view: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
        { view: 'vessels', label: 'Vessels', icon: ShipIcon },
        { view: 'berths', label: 'Berths', icon: AnchorIcon },
        { view: 'alerts', label: 'Alerts', icon: WarningIcon, count: alertCount },
        { view: 'trips', label: 'Trips', icon: RouteIcon },
        { view: 'vessel-analytics', label: 'Vessel Analytics', icon: ChartBarIcon },
        { view: 'logs', label: 'System Logs', icon: DocumentTextIcon },
    ], [alertCount]);
    
    const settingsItems: NavItemConfig[] = useMemo(() => [
        { view: 'settings', label: 'Settings', icon: SettingsIcon, requiresRoles: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.CAPTAIN] },
        { view: 'management', label: 'Manage Ports', icon: CogIcon, requiresAdmin: true },
        { view: 'users', label: 'Manage Users', icon: UsersIcon, requiresAdmin: true },
    ], []);

    const handleViewChange = (view: View) => {
        setActiveView(view);
        if (window.innerWidth < 768) { // md breakpoint
            setIsOpen(false);
        }
    };
    
    if (!currentUser) return null;

    const hasVisibleSettings = settingsItems.some(item => 
        (item.requiresAdmin && currentUser.role === UserRole.ADMIN) || (item.requiresRoles && item.requiresRoles.includes(currentUser.role))
    );

    return (
        <nav className={`fixed top-0 left-0 h-full w-64 bg-gray-900 p-4 border-r border-gray-700 flex flex-col z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Main Menu</h2>
                <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-white md:hidden" aria-label="Close menu"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <ul className="flex-1">
                {navItems.map(item => <NavItem key={item.view} config={item} activeView={activeView} onViewChange={handleViewChange} />)}
                {hasVisibleSettings && <div className="my-4 border-t border-gray-700"></div>}
                {settingsItems.map(item => {
                    const canView = item.requiresAdmin ? currentUser.role === UserRole.ADMIN : item.requiresRoles ? item.requiresRoles.includes(currentUser.role) : true;
                    return canView && <NavItem key={item.view} config={item} activeView={activeView} onViewChange={handleViewChange} />;
                })}
            </ul>
            <div className="mt-auto text-center text-xs text-gray-500">
                <p>&copy; {new Date().getFullYear()} Port Authority</p>
                <p>Version 1.0</p>
            </div>
        </nav>
    );
};

export default SidebarNav;