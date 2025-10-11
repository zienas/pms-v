import React from 'react';
import type { Berth, Ship } from '../types';
import { ShipStatus } from '../types';
import AnchorIcon from './icons/AnchorIcon';
import CloseIcon from './icons/CloseIcon';
import ShipIcon from './icons/ShipIcon';
import { usePort } from '../context/PortContext';

interface BerthDetailModalProps {
    berth: Berth;
    onClose: () => void;
    onManageShip: (ship: Ship) => void;
}

const DetailItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-md font-semibold text-white">{value}</p>
    </div>
);


const BerthDetailModal: React.FC<BerthDetailModalProps> = ({ berth, onClose, onManageShip }) => {
    const { ships } = usePort();
    const occupyingShip = ships.find(s => s.berthIds.includes(berth.id) && s.status !== ShipStatus.LEFT_PORT) || null;
    const isOccupied = !!occupyingShip;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Berth Details</h2>
                        <p className="text-cyan-400 font-semibold">{berth.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    {/* Berth Information */}
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-2">
                           <AnchorIcon className="w-5 h-5 text-gray-400" />
                           Berth Specifications
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Type" value={berth.type} />
                             <DetailItem label="Status" value={isOccupied ? 'Occupied' : 'Available'} />
                            <DetailItem label="Max Length" value={`${berth.maxLength}m`} />
                            <DetailItem label="Max Draft" value={`${berth.maxDraft}m`} />
                        </div>
                    </div>
                    
                    {/* Occupying Vessel Information */}
                    {occupyingShip && (
                         <div className="p-4 bg-green-900/30 rounded-lg border border-green-500/50">
                            <h3 className="text-lg font-semibold mb-3 text-green-300 flex items-center gap-2">
                               <ShipIcon className="w-5 h-5" />
                               Occupying Vessel
                            </h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <DetailItem label="Name" value={occupyingShip.name} />
                                <DetailItem label="IMO" value={occupyingShip.imo} />
                                <DetailItem label="Status" value={occupyingShip.status} />
                                <DetailItem label="ETA" value={new Date(occupyingShip.eta).toLocaleString()} />
                            </div>
                            <div className="text-right">
                                <button
                                    onClick={() => onManageShip(occupyingShip)}
                                    className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-md hover:bg-cyan-700 transition-colors"
                                >
                                    Manage Vessel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

export default BerthDetailModal;