'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  completedWizardSteps: Record<number, boolean>;
  setCompletedWizardSteps: (steps: Record<number, boolean>) => void;
  isWizardStepAllowed: (step: number) => boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [completedWizardSteps, setCompletedWizardSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('superapp_sidebar_collapsed') ?? localStorage.getItem('dps_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsedState(saved === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
    setMounted(true);
  }, []);

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem('superapp_sidebar_collapsed', String(collapsed));
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isWizardStepAllowed = useCallback(
    (stepNumber: number) => {
      // Step 1 is always accessible
      if (stepNumber <= 1) return true;
      // Step N is accessible only if Step N-1 has all required information completed
      return Boolean(completedWizardSteps[stepNumber - 1]);
    },
    [completedWizardSteps]
  );

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed: mounted ? isCollapsed : false,
        setIsCollapsed,
        toggleSidebar,
        completedWizardSteps,
        setCompletedWizardSteps,
        isWizardStepAllowed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
