
import React, { useState, useEffect } from 'react';
import type { Berth, Port } from '../types';
import { BerthType } from '../types';
import GeometryEditor from './GeometryEditor';
import { usePort } from '../context/PortContext';

interface BerthFormModalProps {
    port: Port;
    onClose: () => void;
}

const BerthFormModal: React.FC<BerthFormModalProps> = ({ port, onClose }) => {
    const { editingBerth: berthToEdit, addBerth, updateBerth } = usePort();
    
    const [formData, setFormData] = useState<Omit<Berth, 'id' | 'portId'>>({
        name: '', type: BerthType.BERTH, maxLength: 0, maxDraft: 0,
        equipment: [], quayId: '', positionOnQuay: 0, geometry: [],
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (berthToEdit) {
            setFormData({ ...berthToEdit, geometry: berthToEdit.geometry || [] });
        } else {
             setFormData({ name: '', type: BerthType.BERTH, maxLength: 0, maxDraft: 0, equipment: [], quayId: '', positionOnQuay: 0, geometry: [] });
        }
    }, [berthToEdit]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = 'Berth name is required.';
        if (formData.maxLength <= 0) newErrors.maxLength = 'Max length must be a positive number.';
        if (formData.maxDraft <= 0) newErrors.maxDraft = 'Max draft must be a positive number.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'maxLength' || name === 'maxDraft' || name === 'positionOnQuay' ? parseFloat(value) || 0 : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleGeometryChange = (newGeometry: [number, number][]) => {
        setFormData(prev => ({ ...prev, geometry: newGeometry }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            if (berthToEdit) {
                updateBerth(port.id, berthToEdit.id, { ...berthToEdit, ...formData });
            } else {
                addBerth(port.id, formData);
            }
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 text-white">
                <h2 className="text-2xl font-bold mb-4">{berthToEdit ? 'Edit Berth' : `Add New Berth to ${port.name}`}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                         <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-300">Type</label>
                            <select id="type" name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {Object.values(BerthType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="maxLength" className="block text-sm font-medium text-gray-300">Max Length (m)</label>
                            <input type="number" id="maxLength" name="maxLength" value={formData.maxLength} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.maxLength ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
                            {errors.maxLength && <p className="text-red-500 text-xs mt-1">{errors.maxLength}</p>}
                        </div>
                        <div>
                            <label htmlFor="maxDraft" className="block text-sm font-medium text-gray-300">Max Draft (m)</label>
                            <input type="number" id="maxDraft" name="maxDraft" value={formData.maxDraft} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.maxDraft ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
                            {errors.maxDraft && <p className="text-red-500 text-xs mt-1">{errors.maxDraft}</p>}
                        </div>
                         <div>
                            <label htmlFor="quayId" className="block text-sm font-medium text-gray-300">Quay Identifier</label>
                            <input type="text" id="quayId" name="quayId" value={formData.quayId} onChange={handleChange} placeholder="e.g., quay-1" className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                         <div>
                            <label htmlFor="positionOnQuay" className="block text-sm font-medium text-gray-300">Position on Quay</label>
                            <input type="number" id="positionOnQuay" name="positionOnQuay" value={formData.positionOnQuay} onChange={handleChange} placeholder="e.g., 1, 2, 3..." className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">Berth Geometry</label>
                        <p className="text-xs text-gray-400 mb-2">Draw the shape of the berth within the port boundary (dashed line).</p>
                        <div className="h-64 w-full bg-gray-900 rounded-md border border-gray-600">
                            <GeometryEditor 
                                port={port}
                                geometry={formData.geometry}
                                onChange={handleGeometryChange}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-700">Save Berth</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BerthFormModal;