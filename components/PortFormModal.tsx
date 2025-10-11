
import React, { useState, useEffect } from 'react';
import type { Port } from '../types';
import GeometryEditor from './GeometryEditor';
import * as api from '../services/api';
import { usePort } from '../context/PortContext';
import { toast } from 'react-hot-toast';

interface PortFormModalProps {
    onClose: () => void;
    onSaveSuccess: () => void;
}

const PortFormModal: React.FC<PortFormModalProps> = ({ onClose, onSaveSuccess }) => {
    const { editingPort: portToEdit } = usePort();
    const [formData, setFormData] = useState({
        name: '',
        lat: '',
        lon: '',
        geometry: [] as [number, number][],
        logoImage: undefined as string | undefined,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (portToEdit) {
            setFormData({
                name: portToEdit.name,
                lat: String(portToEdit.lat),
                lon: String(portToEdit.lon),
                geometry: portToEdit.geometry || [],
                logoImage: portToEdit.logoImage,
            });
        } else {
            setFormData({ name: '', lat: '', lon: '', geometry: [], logoImage: undefined });
        }
    }, [portToEdit]);

     const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleGeometryChange = (newGeometry: [number, number][]) => {
        setFormData(prev => ({ ...prev, geometry: newGeometry }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logoImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, logoImage: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = 'Port name is required.';
        const latNum = parseFloat(formData.lat);
        if (isNaN(latNum) || formData.lat.trim() === '') newErrors.lat = 'Latitude is required.';
        else if (latNum < -90 || latNum > 90) newErrors.lat = 'Latitude must be between -90 and 90.';
        const lonNum = parseFloat(formData.lon);
        if (isNaN(lonNum) || formData.lon.trim() === '') newErrors.lon = 'Longitude is required.';
        else if (lonNum < -180 || lonNum > 180) newErrors.lon = 'Longitude must be between -180 and 180.';
        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            const portData = {
                name: formData.name.trim(), lat: latNum, lon: lonNum,
                geometry: formData.geometry, logoImage: formData.logoImage,
            };
            
            const promise = portToEdit 
                ? api.updatePort(portToEdit.id, { ...portToEdit, ...portData })
                : api.addPort(portData);

            await toast.promise(promise, {
                loading: 'Saving port...',
                success: `Port "${portData.name}" saved successfully.`,
                error: 'Failed to save port.',
            });

            onSaveSuccess();
            onClose();
        }
    };

    const currentPortForEditor = {
        id: portToEdit?.id || 'new-port',
        name: formData.name,
        lat: parseFloat(formData.lat) || 0,
        lon: parseFloat(formData.lon) || 0,
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-white">{portToEdit ? 'Edit Port' : 'Add New Port'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Port Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'}`}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="lat" className="block text-sm font-medium text-gray-300">Center Latitude</label>
                            <input
                                type="number"
                                id="lat"
                                name="lat"
                                value={formData.lat}
                                onChange={handleChange}
                                step="any"
                                placeholder="e.g. 1.2647"
                                className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${errors.lat ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'}`}
                            />
                            {errors.lat && <p className="text-red-500 text-xs mt-1">{errors.lat}</p>}
                        </div>
                        <div>
                            <label htmlFor="lon" className="block text-sm font-medium text-gray-300">Center Longitude</label>
                            <input
                                type="number"
                                id="lon"
                                name="lon"
                                value={formData.lon}
                                onChange={handleChange}
                                step="any"
                                placeholder="e.g. 103.8225"
                                className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${errors.lon ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'}`}
                            />
                            {errors.lon && <p className="text-red-500 text-xs mt-1">{errors.lon}</p>}
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Port Logo</label>
                        <div className="mt-2 flex items-center gap-4 p-2 border border-gray-600 rounded-md">
                            <img 
                                src={formData.logoImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'} 
                                alt="Logo preview" 
                                className="w-16 h-16 object-contain rounded bg-gray-900/50"
                            />
                            <div className="flex-1">
                                <input 
                                    id="logo-upload"
                                    type="file" 
                                    accept="image/png, image/jpeg, image/svg+xml"
                                    onChange={handleLogoUpload}
                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600/20 file:text-cyan-300 hover:file:bg-cyan-600/30"
                                />
                                {formData.logoImage && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                                    >
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Port Boundary Geometry</label>
                        <p className="text-xs text-gray-400 mb-2">Click 'Start Drawing' to add points to the map. Drag corners to adjust. The map is centered on the port's coordinates.</p>
                        <div className="h-64 w-full bg-gray-900 rounded-md border border-gray-600">
                            <GeometryEditor 
                                port={currentPortForEditor}
                                geometry={formData.geometry}
                                onChange={handleGeometryChange}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Port</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PortFormModal;