import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '../types';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';

const UserFormModal: React.FC = () => {
    const { addUser, updateUser } = useAuth();
    const { state, actions } = usePort();
    const { ports, modal } = state;
    const { closeModal } = actions;
    const userToEdit = useMemo(() => (modal?.type === 'userForm' ? modal.user : null), [modal]);
    
    const [formData, setFormData] = useState<Omit<User, 'id'>>({
        name: '',
        role: UserRole.OPERATOR,
        portId: undefined,
        password: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const isPortRequired = ![UserRole.ADMIN].includes(formData.role);

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                name: userToEdit.name,
                role: userToEdit.role,
                portId: userToEdit.portId,
                password: '', // Password is not fetched, so it's blank for editing
            });
        } else {
            setFormData({ name: '', role: UserRole.OPERATOR, portId: ports[0]?.id || undefined, password: '' });
        }
    }, [userToEdit, ports]);
    
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = 'User name is required.';
        if (isPortRequired && !formData.portId) {
            newErrors.portId = 'An assigned port is required for this role.';
        }
        if (!userToEdit && !formData.password?.trim()) {
            newErrors.password = 'Password is required for new users.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'role') {
                const newRole = value as UserRole;
                const portIsNowRequired = ![UserRole.ADMIN].includes(newRole);
                if (portIsNowRequired) {
                    newState.portId = newState.portId || ports[0]?.id;
                } else {
                    newState.portId = undefined;
                }
            }
            return newState;
        });
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            if (userToEdit) {
                // For update, we need to pass the ID back
                const userToUpdate: User = { ...formData, id: userToEdit.id };
                // If password field is empty, don't update it
                if (!userToUpdate.password?.trim()) {
                  delete userToUpdate.password;
                }
                await updateUser(userToEdit.id, userToUpdate);
            } else {
                await addUser(formData);
            }
            closeModal();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700 text-white">
                <h2 className="text-2xl font-bold mb-4">{userToEdit ? 'Edit User' : 'Add New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                        <input type="password" id="password" name="password" value={formData.password || ''} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} placeholder={userToEdit ? 'Leave blank to keep unchanged' : ''} />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>
                     <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role</label>
                        <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                     {isPortRequired && (
                        <div>
                            <label htmlFor="portId" className="block text-sm font-medium text-gray-300">Assigned Port</label>
                            <select id="portId" name="portId" value={formData.portId || ''} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.portId ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`}>
                                <option value="">-- Select a Port --</option>
                                {ports.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {errors.portId && <p className="text-red-500 text-xs mt-1">{errors.portId}</p>}
                        </div>
                    )}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-700">Save User</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;
