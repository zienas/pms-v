import React, { useState, createContext, useContext, useEffect, useMemo } from 'react';
import type { AisSource } from '../types';

interface SettingsContextType {
  aisSource: AisSource;
  setAisSource: (source: AisSource) => void;
  approachingThreshold: number;
  setApproachingThreshold: (distance: number) => void;
  pilotThreshold: number;
  setPilotThreshold: (distance: number) => void;
  firstShiftStartHour: number;
  setFirstShiftStartHour: (hour: number) => void;
  shiftDurationHours: number;
  setShiftDurationHours: (hours: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = 'pms_settings';

const loadSettings = (): { 
    aisSource: AisSource; 
    approachingThreshold: number; 
    pilotThreshold: number;
    firstShiftStartHour: number;
    shiftDurationHours: number;
} => {
    try {
      const item = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (item) {
        const settings = JSON.parse(item);
        // Basic validation
        if (
            ['simulator', 'udp', 'serial'].includes(settings.aisSource) && 
            typeof settings.approachingThreshold === 'number' && 
            typeof settings.pilotThreshold === 'number'
        ) {
          return {
              ...settings,
              firstShiftStartHour: settings.firstShiftStartHour ?? 6, // Default to 6 if not present
              shiftDurationHours: settings.shiftDurationHours ?? 8,   // Default to 8 if not present
          };
        }
      }
    } catch (error) {
      console.error("Error reading settings from localStorage", error);
    }
    // Return defaults
    return { 
        aisSource: 'simulator', 
        approachingThreshold: 5, 
        pilotThreshold: 2,
        firstShiftStartHour: 6,
        shiftDurationHours: 8,
    };
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aisSource, setAisSourceState] = useState<AisSource>(() => loadSettings().aisSource);
  const [approachingThreshold, setApproachingThresholdState] = useState<number>(() => loadSettings().approachingThreshold);
  const [pilotThreshold, setPilotThresholdState] = useState<number>(() => loadSettings().pilotThreshold);
  const [firstShiftStartHour, setFirstShiftStartHourState] = useState<number>(() => loadSettings().firstShiftStartHour);
  const [shiftDurationHours, setShiftDurationHoursState] = useState<number>(() => loadSettings().shiftDurationHours);


  useEffect(() => {
    try {
        const settings = { aisSource, approachingThreshold, pilotThreshold, firstShiftStartHour, shiftDurationHours };
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error("Error saving settings to localStorage", error);
    }
  }, [aisSource, approachingThreshold, pilotThreshold, firstShiftStartHour, shiftDurationHours]);

  const setAisSource = (source: AisSource) => setAisSourceState(source);
  const setApproachingThreshold = (distance: number) => setApproachingThresholdState(distance);
  const setPilotThreshold = (distance: number) => setPilotThresholdState(distance);
  const setFirstShiftStartHour = (hour: number) => setFirstShiftStartHourState(hour);
  const setShiftDurationHours = (hours: number) => setShiftDurationHoursState(hours);

  const value = useMemo(() => ({ 
      aisSource, setAisSource,
      approachingThreshold, setApproachingThreshold,
      pilotThreshold, setPilotThreshold,
      firstShiftStartHour, setFirstShiftStartHour,
      shiftDurationHours, setShiftDurationHours,
  }), [aisSource, approachingThreshold, pilotThreshold, firstShiftStartHour, shiftDurationHours]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};