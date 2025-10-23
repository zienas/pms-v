import React, { useState, useEffect, useMemo } from 'react';
import type { Port } from '../types';
import GeometryEditor from './GeometryEditor';
import { usePort } from '../context/PortContext';
import { createCircle } from '../utils/geolocation';
import { toast } from 'react-hot-toast';
import { useLogger } from '../context/InteractionLoggerContext';
import { InteractionEventType } from '../types';

// FIX: Added missing InputField component definition.
const InputField: React.FC<{
    label: string;
    name: string;
    type: string;
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    step?: string;
    readOnly?: boolean;
    placeholder?: string;
}> = ({ label, name, type, value, onChange, error, step, readOnly, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type} id={name} name={name} value={value} onChange={onChange} step={step} readOnly={readOnly} placeholder={placeholder}
            className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 read-only:bg-gray-600 read-only:text-gray-400 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);


const PortFormModal: React.FC = () => {
    const { state, actions } = usePort();
    const { log } = useLogger();
    const portToEdit = useMemo(() => (state.modal?.type === 'portForm' ? state.modal.port : null), [state.modal]);
    const [formData, setFormData] = useState({
        name: '',
        lat: '',
        lon: '',
        geometry: [] as [number, number][],
        logoImage: undefined as string | undefined,
        boundaryType: 'polygon' as 'polygon' | 'circle',
        boundaryRadius: 1000, // Default radius in meters
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
                boundaryType: portToEdit.boundaryType || 'polygon',
                boundaryRadius: portToEdit.boundaryRadius || 1000,
            });
        } else {
            setFormData({ name: '', lat: '0', lon: '0', geometry: [], logoImage: undefined, boundaryType: 'polygon', boundaryRadius: 1000 });
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

    const handlePortCenterChange = (latlng: { lat: number, lng: number }) => {
        const newCenter: [number, number] = [latlng.lat, latlng.lng];
        setFormData(prev => ({
            ...prev,
            lat: String(newCenter[0]),
            lon: String(newCenter[1]),
            geometry: prev.boundaryType === 'circle' ? createCircle(newCenter, prev.boundaryRadius, 64) : prev.geometry,
        }));
    };
    
    const handleCirclePointChange = (type: 'center', latlng: { lat: number, lng: number }) => {
        const newCenter: [number, number] = [latlng.lat, latlng.lng];
        setFormData(prev => ({
            ...prev,
            lat: String(newCenter[0]),
            lon: String(newCenter[1]),
            geometry: createCircle(newCenter, prev.boundaryRadius, 64),
        }));
    };

    const handleCircleRadiusChange = (newRadius: number) => {
        setFormData(prev => ({
            ...prev,
            boundaryRadius: newRadius,
            geometry: createCircle([parseFloat(prev.lat), parseFloat(prev.lon)], newRadius, 64),
        }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newType = e.target.value as 'polygon' | 'circle';
        setFormData(prev => {
            const newLat = parseFloat(prev.lat) || portToEdit?.lat || 0;
            const newLon = parseFloat(prev.lon) || portToEdit?.lon || 0;
            const newGeom = newType === 'circle'
                ? createCircle([newLat, newLon], prev.boundaryRadius, 64)
                : [];
            return {
                ...prev,
                boundaryType: newType,
                geometry: newGeom,
            };
        });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
            if (!supportedTypes.includes(file.type)) {
                toast.error('Unsupported file type. Please upload a PNG, JPEG, or WEBP file.');
                e.target.value = ''; // Reset file input
                return;
            }

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
            log(InteractionEventType.FORM_SUBMIT, {
                action: portToEdit ? 'Update Port' : 'Add Port',
                targetId: portToEdit?.id,
                value: formData.name.trim(),
            });
            const portData: Partial<Port> = {
                name: formData.name.trim(), lat: latNum, lon: lonNum,
                geometry: formData.geometry, logoImage: formData.logoImage,
                boundaryType: formData.boundaryType,
                boundaryRadius: formData.boundaryType === 'circle' ? formData.boundaryRadius : undefined,
            };
            
            if (portToEdit) {
                await actions.updatePort(portToEdit.id, { ...portToEdit, ...portData });
            } else {
                await actions.addPort(portData as Omit<Port, 'id'>);
            }
        }
    };

    const handleCancel = () => {
        log(InteractionEventType.MODAL_CLOSE, {
            action: 'Cancel PortForm',
            targetId: portToEdit?.id,
        });
        actions.closeModal();
    };

    const currentPortForEditor: Port = {
        id: portToEdit?.id || 'new-port',
        name: formData.name,
        lat: parseFloat(formData.lat) || 0,
        lon: parseFloat(formData.lon) || 0,
    };
    
    const portCenter = useMemo((): [number, number] | undefined => {
        const lat = parseFloat(formData.lat);
        const lon = parseFloat(formData.lon);
        return !isNaN(lat) && !isNaN(lon) ? [lat, lon] : undefined;
    }, [formData.lat, formData.lon]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-full overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4 text-white">{portToEdit ? 'Edit Port' : 'Add New Port'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* FIX: Added type="text" to InputField usage */}
                    <InputField label="Port Name" name="name" type="text" value={formData.name} onChange={handleChange} error={errors.name} />
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Center Latitude" name="lat" type="number" step="any" value={formData.lat} onChange={handleChange} error={errors.lat} placeholder="e.g. 1.2647" readOnly={formData.boundaryType === 'circle'} />
                        <InputField label="Center Longitude" name="lon" type="number" step="any" value={formData.lon} onChange={handleChange} error={errors.lon} placeholder="e.g. 103.8225" readOnly={formData.boundaryType === 'circle'}/>
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
                                    accept="image/png, image/jpeg, image/webp"
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
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-gray-300">Port Boundary</label>
                            <button type="button" onClick={() => handleGeometryChange([])} className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors">Clear Boundary</button>
                        </div>
                        <div className="mt-2 flex items-center space-x-6">
                            <label className="flex items-center text-sm text-gray-200 cursor-pointer"><input type="radio" name="boundaryType" value="polygon" checked={formData.boundaryType === 'polygon'} onChange={handleTypeChange} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" /><span className="ml-2">Polygon</span></label>
                            <label className="flex items-center text-sm text-gray-200 cursor-pointer"><input type="radio" name="boundaryType" value="circle" checked={formData.boundaryType === 'circle'} onChange={handleTypeChange} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500" /><span className="ml-2">Circle</span></label>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">Drag the blue teardrop marker to set the port's center coordinates.</p>
                        {formData.boundaryType === 'polygon' && <p className="text-xs text-gray-400 mt-1">Click map to add points. Right-click a point to delete it. Drag points or mid-points to adjust.</p>}
                        {formData.boundaryType === 'circle' && <p className="text-xs text-gray-400 mt-1">Drag the yellow handle to adjust the radius. Drag the blue handle to move the center.</p>}
                        
                        <div className="h-64 w-full bg-gray-900 rounded-md border border-gray-600 mt-2">
                             {formData.boundaryType === 'polygon' ? (
                                <GeometryEditor 
                                    port={currentPortForEditor}
                                    geometry={formData.geometry}
                                    onChange={handleGeometryChange}
                                    portCenter={portCenter}
                                    onPortCenterChange={handlePortCenterChange}
                                />
                            ) : (
                                <GeometryEditor
                                    port={currentPortForEditor}
                                    geometry={formData.geometry} // for preview
                                    centerPoint={[parseFloat(formData.lat) || currentPortForEditor.lat, parseFloat(formData.lon) || currentPortForEditor.lon]}
                                    radius={formData.boundaryRadius}
                                    onPointChange={handleCirclePointChange as any} 
                                    onRadiusChange={handleCircleRadiusChange}
                                    portCenter={portCenter}
                                    onPortCenterChange={handlePortCenterChange}
                                />
                            )}
                        </div>
                    </div>
                    {/* FIX: Repaired truncated file end with buttons and closing tags */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Port</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PortFormModal;
