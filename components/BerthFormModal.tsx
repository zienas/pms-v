import React, { useState, useEffect, useMemo } from 'react';
import type { Berth, Port } from '../types';
import { BerthType } from '../types';
import GeometryEditor from './GeometryEditor';
import { usePort } from '../context/PortContext';
import { calculateDistanceMeters, createRectangleFromLine, createCircle } from '../utils/geolocation';

interface BerthFormModalProps {
    port: Port;
}

const InputField: React.FC<{ label: string; name: string; type: string; value: any; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; step?: string; readOnly?: boolean; placeholder?: string; }> = 
    ({ label, name, type, value, onChange, error, step, readOnly, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type} id={name} name={name} value={value} onChange={onChange} step={step} readOnly={readOnly} placeholder={placeholder}
            className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 read-only:bg-gray-600 read-only:text-gray-400 ${error ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const BerthFormModal: React.FC<BerthFormModalProps> = ({ port }) => {
    const { state, actions } = usePort();
    const { addBerth, updateBerth, closeModal } = actions;
    const berthToEdit = useMemo(() => (state.modal?.type === 'berthForm' ? state.modal.berth : null), [state.modal]);
    
    // State for the form itself
    const [formData, setFormData] = useState({
        name: '', type: BerthType.BERTH, maxDraft: 0,
        equipment: [] as string[], quayId: '', positionOnQuay: 0,
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // State for geometry definition
    const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
    const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
    const [berthWidth, setBerthWidth] = useState(20);
    const [centerPoint, setCenterPoint] = useState<[number, number] | null>(null);
    const [anchorageRadius, setAnchorageRadius] = useState(150);
    const [pointSelectionMode, setPointSelectionMode] = useState<'start' | 'end' | 'center' | null>(null);
    
    const [previewGeometry, setPreviewGeometry] = useState<[number, number][] | undefined>(undefined);

    // Populate form on edit
    useEffect(() => {
        if (berthToEdit) {
            setFormData({
                name: berthToEdit.name,
                type: berthToEdit.type,
                maxDraft: berthToEdit.maxDraft,
                equipment: berthToEdit.equipment || [],
                quayId: berthToEdit.quayId,
                positionOnQuay: berthToEdit.positionOnQuay
            });
            setPreviewGeometry(berthToEdit.geometry);
            if (berthToEdit.type === BerthType.ANCHORAGE && berthToEdit.radius) {
                setAnchorageRadius(berthToEdit.radius);
            }
             // For existing berths, we don't have the original points, just the polygon.
            // This is a simplification; a more complex implementation might reverse-calculate them.
        } else {
             // Reset everything for a new berth
            setFormData({ name: '', type: BerthType.BERTH, maxDraft: 0, equipment: [], quayId: '', positionOnQuay: 0 });
            setStartPoint(null); setEndPoint(null); setBerthWidth(20);
            setCenterPoint(null); setAnchorageRadius(150);
            setPreviewGeometry(undefined);
        }
    }, [berthToEdit]);
    
    // Update preview geometry when points change
    useEffect(() => {
        if (formData.type === BerthType.ANCHORAGE && centerPoint) {
            setPreviewGeometry(createCircle(centerPoint, anchorageRadius, 64));
        } else if ((formData.type === BerthType.BERTH || formData.type === BerthType.QUAY) && startPoint && endPoint) {
            setPreviewGeometry(createRectangleFromLine(startPoint, endPoint, berthWidth));
        } else if (!berthToEdit) {
            setPreviewGeometry(undefined);
        }
    }, [formData.type, startPoint, endPoint, berthWidth, centerPoint, anchorageRadius, berthToEdit]);


    const calculatedLength = useMemo(() => {
        if ((formData.type === BerthType.BERTH || formData.type === BerthType.QUAY) && startPoint && endPoint) {
            return calculateDistanceMeters(startPoint[0], startPoint[1], endPoint[0], endPoint[1]);
        }
        if (formData.type === BerthType.ANCHORAGE) {
            return anchorageRadius * 2;
        }
        return berthToEdit?.maxLength || 0;
    }, [formData.type, startPoint, endPoint, anchorageRadius, berthToEdit]);


    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = 'Berth name is required.';
        if (formData.maxDraft <= 0) newErrors.maxDraft = 'Max draft must be a positive number.';
        if (formData.type !== BerthType.ANCHORAGE && (!startPoint || !endPoint) && !berthToEdit?.geometry) newErrors.geometry = 'Both start and end points must be set for a new berth.';
        if (formData.type === BerthType.ANCHORAGE && !centerPoint && !berthToEdit?.geometry) newErrors.geometry = 'A center point must be set for a new anchorage.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: ['maxDraft', 'positionOnQuay'].includes(name) ? parseFloat(value) || 0 : value }));
    };

    const handlePointSet = (latlng: { lat: number, lng: number }) => {
        const point: [number, number] = [latlng.lat, latlng.lng];
        if (pointSelectionMode === 'start' || (!startPoint && formData.type !== BerthType.ANCHORAGE)) setStartPoint(point);
        else if (pointSelectionMode === 'end' || (!endPoint && formData.type !== BerthType.ANCHORAGE)) setEndPoint(point);
        else if (pointSelectionMode === 'center' || (!centerPoint && formData.type === BerthType.ANCHORAGE)) setCenterPoint(point);
        setPointSelectionMode(null); // Deactivate selection mode after one click
    };
    
    const handlePointChange = (type: 'start' | 'end' | 'center', latlng: { lat: number, lng: number }) => {
        const point: [number, number] = [latlng.lat, latlng.lng];
        if (type === 'start') setStartPoint(point);
        else if (type === 'end') setEndPoint(point);
        else if (type === 'center') setCenterPoint(point);
    };

    const handleRadiusChange = (newRadius: number) => {
        setAnchorageRadius(newRadius);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const finalBerthData: Omit<Berth, 'id'> = {
                portId: port.id,
                ...formData,
                maxLength: calculatedLength,
                geometry: previewGeometry,
                radius: formData.type === BerthType.ANCHORAGE ? anchorageRadius : undefined,
            };
            
            if (berthToEdit) {
                await updateBerth(port.id, berthToEdit.id, { ...berthToEdit, ...finalBerthData });
            } else {
                await addBerth(port.id, finalBerthData);
            }
        }
    };
    
    const renderBerthInputs = () => (
        <>
            <InputField label="Start Coordinates" name="startCoords" type="text" value={startPoint ? `${startPoint[0].toFixed(5)}, ${startPoint[1].toFixed(5)}` : 'Click map to set'} onChange={() => {}} readOnly />
            <InputField label="End Coordinates" name="endCoords" type="text" value={endPoint ? `${endPoint[0].toFixed(5)}, ${endPoint[1].toFixed(5)}` : 'Click map to set'} onChange={() => {}} readOnly />
            <InputField label="Width (m)" name="width" type="number" value={berthWidth} onChange={(e) => setBerthWidth(parseFloat(e.target.value) || 0)} />
            <div>
                <label className="block text-sm font-medium text-gray-400">Calculated Length</label>
                <p className="mt-1 text-lg font-semibold">{calculatedLength.toFixed(2)}m</p>
            </div>
        </>
    );

     const renderAnchorageInputs = () => (
        <>
            <InputField label="Center Coordinates" name="centerCoords" type="text" value={centerPoint ? `${centerPoint[0].toFixed(5)}, ${centerPoint[1].toFixed(5)}` : 'Click map to set'} onChange={() => {}} readOnly />
            <InputField label="Radius (m)" name="radius" type="number" value={anchorageRadius} onChange={(e) => setAnchorageRadius(parseFloat(e.target.value) || 0)} />
            <div>
                <label className="block text-sm font-medium text-gray-400">Max Vessel Length (Diameter)</label>
                <p className="mt-1 text-lg font-semibold">{calculatedLength.toFixed(2)}m</p>
            </div>
        </>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl border border-gray-700 text-white max-h-full flex flex-col">
                <div className="flex-shrink-0">
                    <h2 className="text-2xl font-bold mb-4">{berthToEdit ? 'Edit Berth' : `Add New Berth to ${port.name}`}</h2>
                </div>
                
                <form id="berth-form" onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                    {/* Form Fields */}
                    <div className="md:w-1/2 space-y-4 overflow-y-auto pr-2">
                        <InputField label="Name" name="name" type="text" value={formData.name} onChange={handleFormChange} error={errors.name} />
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-300">Type</label>
                            <select id="type" name="type" value={formData.type} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {Object.values(BerthType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <InputField label="Max Draft (m)" name="maxDraft" type="number" value={formData.maxDraft} onChange={handleFormChange} error={errors.maxDraft} />
                        
                        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                            <h3 className="text-lg font-semibold text-cyan-400">Define Geometry</h3>
                            <p className="text-xs text-gray-400 -mt-2">Click on the map to set points, then drag them to adjust.</p>
                            {formData.type === BerthType.ANCHORAGE ? renderAnchorageInputs() : renderBerthInputs()}
                            {errors.geometry && <p className="text-red-500 text-xs mt-1">{errors.geometry}</p>}
                        </div>

                        <InputField label="Quay Identifier" name="quayId" type="text" value={formData.quayId} onChange={handleFormChange} placeholder="e.g., quay-1" />
                        <InputField label="Position on Quay" name="positionOnQuay" type="number" value={formData.positionOnQuay} onChange={handleFormChange} placeholder="e.g., 1, 2, 3..." />
                    </div>

                    {/* Map Editor */}
                    <div className="md:w-1/2 flex flex-col gap-2 min-h-[300px] md:min-h-0">
                         <label className="block text-sm font-medium text-gray-300">Geometry Editor</label>
                         <div className="flex-1 bg-gray-900 rounded-md border border-gray-600">
                            <GeometryEditor 
                                port={port}
                                geometry={previewGeometry}
                                onPointSet={handlePointSet}
                                onPointChange={handlePointChange}
                                onRadiusChange={handleRadiusChange}
                                startPoint={startPoint}
                                endPoint={endPoint}
                                centerPoint={centerPoint}
                                radius={anchorageRadius}
                            />
                        </div>
                    </div>
                </form>

                <div className="flex-shrink-0 flex justify-end gap-4 pt-4 mt-4 border-t border-gray-700">
                    <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
                    <button type="submit" form="berth-form" className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-700">Save Berth</button>
                </div>
            </div>
        </div>
    );
};

export default BerthFormModal;
