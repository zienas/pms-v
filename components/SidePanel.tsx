

import React, { useState } from 'react';
import type { Ship, Berth, Alert } from '../types';
import ShipList from './ShipList';
import BerthList from './BerthList';
import AlertsPanel from './AlertsPanel';
import ShipIcon from './icons/ShipIcon';
import AnchorIcon from './icons/AnchorIcon';
import WarningIcon from './icons/WarningIcon';

interface SidePanelProps {
  ships: Ship[];
  berths: Berth[];
  alerts: Alert[];
  onAddShip: () => void;
  onEditShip: (ship: Ship) => void;
  onDeleteShip: (id: string) => void;
}

type Tab = 'ships' | 'berths' | 'alerts';

const SidePanel: React.FC<SidePanelProps> = ({ ships, berths, alerts, onAddShip, onEditShip, onDeleteShip }) => {
  const [activeTab, setActiveTab] = useState<Tab>('ships');

  const getTabClass = (tabName: Tab) => {
    return `flex-1 py-2 px-4 text-sm font-medium text-center rounded-t-lg cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 ${
      activeTab === tabName
        ? 'bg-gray-700 text-cyan-300 border-b-2 border-cyan-300'
        : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
    }`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-700">
        <button onClick={() => setActiveTab('ships')} className={getTabClass('ships')}>
          <ShipIcon className="w-5 h-5" /> Ships ({ships.length})
        </button>
        <button onClick={() => setActiveTab('berths')} className={getTabClass('berths')}>
          <AnchorIcon className="w-5 h-5" /> Berths ({berths.length})
        </button>
        <button onClick={() => setActiveTab('alerts')} className={getTabClass('alerts')}>
          <WarningIcon className="w-5 h-5" /> Alerts <span className={`ml-2 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${alerts.length > 0 ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'}`}>{alerts.length}</span>
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'ships' && <ShipList ships={ships} onAddShip={onAddShip} onEditShip={onEditShip} onDeleteShip={onDeleteShip} />}
        {activeTab === 'berths' && <BerthList berths={berths} ships={ships} />}
        {activeTab === 'alerts' && <AlertsPanel alerts={alerts} />}
      </div>
    </div>
  );
};

export default SidePanel;