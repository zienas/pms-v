import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { InteractionEventType, View } from '../types';
import * as api from '../services/api';
import { useAuth } from './AuthContext';
import { usePort } from './PortContext';

interface LogDetails {
    message?: string;
    view?: View;
    action?: string;
    value?: any;
    targetId?: string;
}

interface InteractionLoggerContextType {
    log: (eventType: InteractionEventType, details: LogDetails) => void;
}

const InteractionLoggerContext = createContext<InteractionLoggerContextType | undefined>(undefined);

export const InteractionLoggerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { state } = usePort();
    const { selectedPortId } = state;

    const log = useCallback((eventType: InteractionEventType, details: LogDetails) => {
        if (!currentUser || !selectedPortId) {
            return; // Don't log if user is not logged in or no port is selected
        }

        const message = details.message || `${details.action || eventType}${details.value !== undefined ? `: ${details.value}` : ''}`;

        api.logInteraction({
            userId: currentUser.id,
            userName: currentUser.name,
            portId: selectedPortId,
            eventType,
            details: {
                ...details,
                message,
            },
        });
    }, [currentUser, selectedPortId]);

    const value = useMemo(() => ({ log }), [log]);

    return (
        <InteractionLoggerContext.Provider value={value}>
            {children}
        </InteractionLoggerContext.Provider>
    );
};

export const useLogger = (): InteractionLoggerContextType => {
    const context = useContext(InteractionLoggerContext);
    if (context === undefined) {
        throw new Error('useLogger must be used within an InteractionLoggerProvider');
    }
    return context;
};