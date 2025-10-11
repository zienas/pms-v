
import React, { useState, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { AisSource, Port } from '../types';
import * as api from '../services/api';
import { toast } from 'react-hot-toast';

interface SettingsPageProps {
    ports: Port[];
    selectedPortId: string | null;
    onPortUpdateSuccess: () => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ ports, selectedPortId, onPortUpdateSuccess }) => {
    const { aisSource, setAisSource } = useSettings();
    const [newMapImage, setNewMapImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const selectedPort = useMemo(() => ports.find(p => p.id === selectedPortId), [ports, selectedPortId]);

    const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAisSource(e.target.value as AisSource);
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewMapImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSaveMapImage = async () => {
        if (!selectedPort || !newMapImage) return;
        setIsSaving(true);
        const promise = api.updatePort(selectedPort.id, { ...selectedPort, mapImage: newMapImage });
        
        toast.promise(promise, {
            loading: 'Saving map image...',
            success: 'Map image updated!',
            error: 'Failed to save image.',
        });
        
        await promise;
        await onPortUpdateSuccess();
        setNewMapImage(null);
        setIsSaving(false);
    };

    const handleRemoveMapImage = async () => {
        if (!selectedPort) return;
        setIsSaving(true);
        const promise = api.updatePort(selectedPort.id, { ...selectedPort, mapImage: undefined });

        toast.promise(promise, {
            loading: 'Removing map image...',
            success: 'Map image removed.',
            error: 'Failed to remove image.',
        });

        await promise;
        await onPortUpdateSuccess();
        setNewMapImage(null);
        setIsSaving(false);
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 h-full text-white overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">Application Settings</h1>

            <div className="max-w-2xl space-y-8">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">AIS Data Source</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Select the source for real-time vessel data. The internal simulator is for demonstration purposes.
                        Select a live feed option for production environments.
                    </p>
                    
                    <fieldset className="space-y-4">
                        <legend className="sr-only">AIS Data Source Options</legend>
                        
                        <div className="flex items-center">
                            <input
                                id="simulator"
                                name="aisSource"
                                type="radio"
                                value="simulator"
                                checked={aisSource === 'simulator'}
                                onChange={handleSourceChange}
                                className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="simulator" className="ml-3 block text-sm font-medium text-gray-200">
                                Internal Simulator (Default)
                            </label>
                        </div>
                        
                        <div className="flex items-center">
                            <input
                                id="udp"
                                name="aisSource"
                                type="radio"
                                value="udp"
                                checked={aisSource === 'udp'}
                                onChange={handleSourceChange}
                                className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="udp" className="ml-3 block text-sm font-medium text-gray-200">
                                Live UDP/LAN Feed
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="serial"
                                name="aisSource"
                                type="radio"
                                value="serial"
                                checked={aisSource === 'serial'}
                                onChange={handleSourceChange}
                                className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="serial" className="ml-3 block text-sm font-medium text-gray-200">
                                Live Serial Port Feed
                            </label>
                        </div>
                    </fieldset>
                    
                    {(aisSource === 'udp' || aisSource === 'serial') && (
                        <div className="mt-6 p-4 bg-orange-900/40 border border-orange-600/70 rounded-md text-sm">
                            <h3 className="font-semibold text-orange-300">Action Required: Start Ingestion Service</h3>
                            <p className="mt-2 text-orange-200">
                                To receive data from a live feed, you must run the appropriate backend ingestion service on your server.
                                The internal simulator has now been disabled.
                            </p>
                            <a href="./HOWTO-GOLIVE.md" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-bold text-orange-400 hover:text-orange-300 underline">
                                View Go-Live Instructions &rarr;
                            </a>
                        </div>
                    )}
                </div>
                
                 <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Map Background Customization</h2>
                    <p className="text-sm text-gray-400 mb-4">
                       Upload an image (e.g., a satellite photo or port chart) to serve as the background for the live port map.
                       This will apply to the currently selected port: <strong className="text-cyan-400">{selectedPort?.name || '...'}</strong>
                    </p>
                    
                    {selectedPort ? (
                        <>
                            <div className="mt-4">
                               <label htmlFor="map-image-upload" className="block text-sm font-medium text-gray-300 mb-2">Upload New Image</label>
                               <input 
                                 id="map-image-upload"
                                 type="file" 
                                 accept="image/*"
                                 onChange={handleImageUpload}
                                 className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600/20 file:text-cyan-300 hover:file:bg-cyan-600/30"
                                />
                            </div>
                            
                            <div className="mt-4 p-2 border border-gray-700 rounded-md">
                                <p className="text-xs text-center text-gray-400 mb-2">Image Preview</p>
                                <img 
                                    src={newMapImage || selectedPort.mapImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'} 
                                    alt="Map preview" 
                                    className="w-full h-48 object-contain rounded bg-gray-900/50"
                                />
                            </div>
                            
                            <div className="mt-6 flex gap-4">
                                <button 
                                    onClick={handleSaveMapImage}
                                    disabled={!newMapImage || isSaving}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Saving...' : 'Save Image'}
                                </button>
                                <button 
                                    onClick={handleRemoveMapImage}
                                    disabled={!selectedPort.mapImage || isSaving}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? 'Removing...' : 'Remove Image'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500">No port selected.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;