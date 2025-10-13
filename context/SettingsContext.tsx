import React, { useState, createContext, useContext, useEffect, useMemo } from 'react';
import type { AisSource } from '../types';

interface SettingsContextType {
  aisSource: AisSource;
  setAisSource: (source: AisSource) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = 'pms_settings';

const loadSettings = (): { aisSource: AisSource } => {
    try {
      const item = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (item) {
        const settings = JSON.parse(item);
        if (['simulator', 'udp', 'serial'].includes(settings.aisSource)) {
          return settings;
        }
      }
    } catch (error) {
      console.error("Error reading settings from localStorage", error);
    }
    return { aisSource: 'simulator' };
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aisSource, setAisSourceState] = useState<AisSource>(() => loadSettings().aisSource);

  useEffect(() => {
    try {
        const settings = { aisSource };
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Error saving settings to localStorage", error);
    }
  }, [aisSource]);

  const setAisSource = (source: AisSource) => {
      setAisSourceState(source);
  };

  const value = useMemo(() => ({ aisSource, setAisSource }), [aisSource]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
