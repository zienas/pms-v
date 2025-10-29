import React, { useState } from 'react';
import type { Ship } from '../types';
import { MovementEventType, InteractionEventType } from '../types';
import { usePort } from '../context/PortContext';
import { useLogger } from '../context/InteractionLoggerContext';

const LogMovementModal: React.FC<{ ship: Ship }> = ({ ship }) => {
    const { actions } = usePort();
    const { log } = useLogger();
    const { addMovementLog, closeModal } = actions;
    
    const [timestamp, setTimestamp] = useState(new Date().toISOString().substring(0, 16));
    const [message, setMessage] = useState('');
    const [eventType, setEventType] = useState<MovementEventType>(MovementEventType.MANUAL_LOG);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            setError('Message is required.');
            return;
        }
        setError('');

        log(InteractionEventType.FORM_SUBMIT, {
            action: 'Log Vessel Event',
            targetId: ship.id,
            value: { eventType, message: message.trim() },
        });
        
        addMovementLog(ship, eventType, message.trim(), new Date(timestamp).toISOString()).then(closeModal);
    };

    const handleCancel = () => {
        log(InteractionEventType.MODAL_CLOSE, {
            action: 'Cancel LogMovement',
            targetId: ship.id,
        });
        closeModal();
    };

    const manuallyLoggableEvents = [
        MovementEventType.MANUAL_LOG,
        MovementEventType.PORT_SERVICE,
        MovementEventType.STATUS_CHANGE,
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
                <h2 className="text-2xl font-bold mb-2 text-white">Log Vessel Event</h2>
                <p className="text-gray-300 mb-4">For Vessel: <span className="font-semibold text-white">{ship.name}</span></p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="eventType" className="block text-sm font-medium text-gray-300">Event Type</label>
                        <select
                            id="eventType"
                            name="eventType"
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value as MovementEventType)}
                            className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            {manuallyLoggableEvents.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="timestamp" className="block text-sm font-medium text-gray-300">Event Timestamp</label>
                        <input
                            type="datetime-local"
                            id="timestamp"
                            name="timestamp"
                            value={timestamp}
                            onChange={(e) => setTimestamp(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-300">Event Message</label>
                        <textarea
                            id="message"
                            name="message"
                            rows={4}
                            value={message}
                            onChange={(e) => { setMessage(e.target.value); if (error) setError(''); }}
                            className={`mt-1 block w-full px-3 py-2 bg-gray-700 text-white border rounded-md focus:outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-cyan-500'}`}
                            placeholder="e.g., Bunkering started, customs inspection complete, status changed to Anchored..."
                        />
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={handleCancel} data-logging-handler="true" className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button type="submit" data-logging-handler="true" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Log</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LogMovementModal;