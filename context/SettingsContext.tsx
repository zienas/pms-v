
import React, { useState, createContext, useContext } from 'react';
import type { AisSource } from '../types';

interface SettingsContextType {
  aisSource: AisSource;
  setAisSource: (source: AisSource) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aisSource, setAisSource] = useState<AisSource>('simulator');

  const value = { aisSource, setAisSource };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};