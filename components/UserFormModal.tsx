import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '../types';
import { UserRole, InteractionEventType } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { useLogger } from '../context/InteractionLoggerContext';

const UserFormModal: React.FC = () => {
    const { currentUser, addUser, updateUser } = useAuth();
    const { state, actions } = usePort();
    const { log } = useLogger();
    const { ports, modal } = state;
    const { closeModal } = actions;
    const userToEdit = useMemo(() => (modal?.type === 'userForm' ? modal.user : null), [modal]);
    
    const [formData, setFormData] = useState<Omit<User, 'id'>>({
        name: '',
        email: '',
        phone: '',
        gsm: '',
        company: '',
        role: UserRole.OPERATOR,
        portId: undefined,
        password: '',
        notes: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    
    const isPortRequired = ![UserRole.ADMIN].includes(formData.role);
    
    const availableRoles = useMemo(() => {
        if (!currentUser) return [];
        if (currentUser.role === UserRole.ADMIN) {
            return Object.values(UserRole);
        }
        if (currentUser.role === UserRole.SUPERVISOR) {
            return [UserRole.OPERATOR, UserRole.AGENT, UserRole.PILOT];
        }
        return [];
    }, [currentUser]);

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                name: userToEdit.name,
                email: userToEdit.email || '',
                phone: userToEdit.phone || '',
                gsm: userToEdit.gsm || '',
                company: userToEdit.company || '',
                role: userToEdit.role,
                portId: userToEdit.portId,
                password: '', // Password is not fetched, so it's blank for editing
                notes: userToEdit.notes || '',
            });
        } else {
            setFormData({ 
                name: '', email: '', phone: '', gsm: '', company: '',
                role: availableRoles[0] || UserRole.OPERATOR, 
                portId: ports[0]?.id || undefined, 
                password: '',
                notes: '',
            });
        }
    }, [userToEdit, ports, availableRoles]);
    
    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = 'User name is required.';
        if (isPortRequired && !formData.portId) {
            newErrors.portId = 'An assigned port is required for this role.';
        }
        if (!userToEdit && !formData.password?.trim()) {
            newErrors.password = 'Password is required for new users.';
        }
        if (formData.email && !/.+@.+\..+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
            log(InteractionEventType.FORM_SUBMIT, {
                action: userToEdit ? 'Update User' : 'Add User',
                targetId: userToEdit?.id,
                value: formData.name,
            });
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

    const handleCancel = () => {
        log(InteractionEventType.MODAL_CLOSE, {
            action: 'Cancel UserForm',
            targetId: userToEdit?.id,
        });
        closeModal();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 text-white max-h-full overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">{userToEdit ? 'Edit User' : 'Add New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                            <input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label>
                            <input type="tel" id="phone" name="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                         <div>
                            <label htmlFor="gsm" className="block text-sm font-medium text-gray-300">GSM / Mobile</label>
                            <input type="tel" id="gsm" name="gsm" value={formData.gsm || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                         <div>
                            <label htmlFor="company" className="block text-sm font-medium text-gray-300">Company</label>
                            <input type="text" id="company" name="company" value={formData.company || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                            <input type="password" id="password" name="password" value={formData.password || ''} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-700 border rounded-md focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500' : 'border-gray-600 focus:ring-cyan-500'}`} placeholder={userToEdit ? 'Leave blank to keep unchanged' : ''} />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role</label>
                            <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
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
                        <div className="md:col-span-2">
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes</label>
                            <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={handleCancel} data-logging-handler="true" className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
                        <button type="submit" data-logging-handler="true" className="px-4 py-2 bg-cyan-600 rounded-md hover:bg-cyan-700">Save User</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;