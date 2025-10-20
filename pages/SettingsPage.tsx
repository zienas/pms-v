import React from 'react';
import { useSettings } from '../context/SettingsContext';
import type { AisSource } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const SettingsPage: React.FC = () => {
    const { 
        aisSource, setAisSource,
        approachingThreshold, setApproachingThreshold,
        pilotThreshold, setPilotThreshold,
        firstShiftStartHour, setFirstShiftStartHour,
        shiftDurationHours, setShiftDurationHours,
    } = useSettings();
    const { currentUser } = useAuth();
    
    const canEditAdvancedSettings = currentUser && [UserRole.ADMIN, UserRole.SUPERVISOR].includes(currentUser.role);

    return (
        <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 h-full text-white overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">Application Settings</h1>
            <div className="max-w-2xl space-y-8">
                {canEditAdvancedSettings && (
                    <>
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4">AIS Data Source</h2>
                            <p className="text-sm text-gray-400 mb-4">Select the source for real-time vessel data. The simulator is for demonstration. For production, select a live feed and run the ingestion service.</p>
                            <fieldset className="space-y-4">
                                <legend className="sr-only">AIS Data Source Options</legend>
                                {(['simulator', 'udp', 'serial'] as AisSource[]).map(source => (
                                    <div className="flex items-center" key={source}>
                                        <input id={source} name="aisSource" type="radio" value={source} checked={aisSource === source} onChange={(e) => setAisSource(e.target.value as AisSource)} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" />
                                        <label htmlFor={source} className="ml-3 block text-sm font-medium text-gray-200 capitalize">{source.replace('udp', 'Live UDP/LAN Feed').replace('serial', 'Live Serial Port Feed').replace('simulator','Internal Simulator')}</label>
                                    </div>
                                ))}
                            </fieldset>
                            {aisSource !== 'simulator' && (
                                <div className="mt-6 p-4 bg-orange-900/40 border border-orange-600/70 rounded-md text-sm">
                                    <h3 className="font-semibold text-orange-300">Action Required: Start Ingestion Service</h3>
                                    <p className="mt-2 text-orange-200">The internal simulator is now disabled. You must run the backend ingestion service to receive live data.</p>
                                    <a href="./HOWTO-GOLIVE.md" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-bold text-orange-400 hover:text-orange-300 underline">View Go-Live Instructions &rarr;</a>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                            <h2 className="text-xl font-semibold mb-4">Operator Shift Settings</h2>
                            <p className="text-sm text-gray-400 mb-4">Configure the automatic logout schedule for users with the 'Port Operator' role.</p>
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="firstShiftStartHour" className="block text-sm font-medium text-gray-300">1st Shift Start Time</label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <input id="firstShiftStartHour" type="range" min="0" max="23" step="1" value={firstShiftStartHour} onChange={(e) => setFirstShiftStartHour(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                        <span className="text-cyan-400 font-semibold w-24 text-center">{`${firstShiftStartHour.toString().padStart(2, '0')}:00`}</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="shiftDurationHours" className="block text-sm font-medium text-gray-300">Shift Duration</label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <input id="shiftDurationHours" type="range" min="4" max="12" step="1" value={shiftDurationHours} onChange={(e) => setShiftDurationHours(parseInt(e.target.value, 10))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                        <span className="text-cyan-400 font-semibold w-24 text-center">{shiftDurationHours} hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Alert Thresholds</h2>
                     <div className="space-y-6">
                        <div>
                            <label htmlFor="approachingThreshold" className="block text-sm font-medium text-gray-300">Vessel Approaching Warning</label>
                            <div className="flex items-center gap-4 mt-2">
                                <input id="approachingThreshold" type="range" min="1" max="20" step="0.5" value={approachingThreshold} onChange={(e) => setApproachingThreshold(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-cyan-400 font-semibold w-20 text-center">{approachingThreshold.toFixed(1)} NM</span>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="pilotThreshold" className="block text-sm font-medium text-gray-300">Pilot Assignment Warning</label>
                             <div className="flex items-center gap-4 mt-2">
                                <input id="pilotThreshold" type="range" min="0.5" max="10" step="0.5" value={pilotThreshold} onChange={(e) => setPilotThreshold(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-cyan-400 font-semibold w-20 text-center">{pilotThreshold.toFixed(1)} NM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;