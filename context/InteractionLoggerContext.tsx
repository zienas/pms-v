import React, { createContext, useContext, useCallback, useMemo, useRef, useEffect } from 'react';
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
    
    // Use refs to hold the latest state without causing the log function to be recreated
    const authRef = useRef({ currentUser });
    const portStateRef = useRef({ selectedPortId: state.selectedPortId });

    useEffect(() => {
        authRef.current = { currentUser };
    }, [currentUser]);

    useEffect(() => {
        portStateRef.current = { selectedPortId: state.selectedPortId };
    }, [state.selectedPortId]);


    const log = useCallback((eventType: InteractionEventType, details: LogDetails) => {
        const { currentUser: currentAuthUser } = authRef.current;
        const { selectedPortId: currentPortId } = portStateRef.current;

        if (!currentAuthUser || !currentPortId) {
            return; // Don't log if user is not logged in or no port is selected
        }

        let valueString = '';
        if (details.value !== undefined) {
            if (typeof details.value === 'object' && details.value !== null) {
                try {
                    valueString = `: ${JSON.stringify(details.value)}`;
                } catch (e) {
                    valueString = ': [unserializable object]';
                }
            } else {
                valueString = `: ${details.value}`;
            }
        }
        const message = details.message || `${details.action || eventType}${valueString}`;

        api.logInteraction({
            userId: currentAuthUser.id,
            userName: currentAuthUser.name,
            portId: currentPortId,
            eventType,
            details: {
                ...details,
                message,
            },
        });
    }, []); // The dependency array is now empty, making `log` a stable function

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
