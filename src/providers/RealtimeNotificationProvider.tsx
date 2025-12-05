import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';

interface RealtimeNotificationContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  browserNotificationsEnabled: boolean;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  requestBrowserPermission: () => Promise<boolean>;
  browserPermissionStatus: NotificationPermission | 'unsupported';
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType | null>(null);

const STORAGE_KEYS = {
  SOUND: 'notification-sound-enabled',
  BROWSER: 'notification-browser-enabled',
};

export function RealtimeNotificationProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SOUND);
    return stored === null ? true : stored === 'true';
  });

  const [browserNotificationsEnabled, setBrowserNotificationsEnabledState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BROWSER);
    return stored === 'true';
  });

  const [browserPermissionStatus, setBrowserPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() => {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.SOUND, String(enabled));
  }, []);

  const setBrowserNotificationsEnabled = useCallback((enabled: boolean) => {
    setBrowserNotificationsEnabledState(enabled);
    localStorage.setItem(STORAGE_KEYS.BROWSER, String(enabled));
  }, []);

  // Initialize realtime hooks
  const { requestBrowserPermission: requestPermission } = useRealtimeNotifications({
    soundEnabled,
    browserNotificationsEnabled,
  });

  // Initialize orders and tasks realtime
  useOrdersRealtime();
  useTasksRealtime();

  const requestBrowserPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      setBrowserNotificationsEnabled(true);
      setBrowserPermissionStatus('granted');
    } else {
      setBrowserPermissionStatus('denied');
    }
    return granted;
  }, [requestPermission, setBrowserNotificationsEnabled]);

  // Check permission status on mount
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermissionStatus(Notification.permission);
    }
  }, []);

  return (
    <RealtimeNotificationContext.Provider
      value={{
        soundEnabled,
        setSoundEnabled,
        browserNotificationsEnabled,
        setBrowserNotificationsEnabled,
        requestBrowserPermission,
        browserPermissionStatus,
      }}
    >
      {children}
    </RealtimeNotificationContext.Provider>
  );
}

export function useRealtimeNotificationSettings() {
  const context = useContext(RealtimeNotificationContext);
  if (!context) {
    throw new Error('useRealtimeNotificationSettings must be used within RealtimeNotificationProvider');
  }
  return context;
}
