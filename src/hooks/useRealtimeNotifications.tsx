import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NotificationPayload {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_task_id: string | null;
  created_at: string;
}

interface UseRealtimeNotificationsOptions {
  userId?: string;
  soundEnabled?: boolean;
  browserNotificationsEnabled?: boolean;
}

// Generate a notification sound using Web Audio API
function createNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6 note
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.error('Could not play notification sound:', e);
  }
}

export function useRealtimeNotifications({
  userId,
  soundEnabled = true,
  browserNotificationsEnabled = false,
}: UseRealtimeNotificationsOptions = {}) {
  const queryClient = useQueryClient();

  const playSound = useCallback(() => {
    if (soundEnabled) {
      createNotificationSound();
    }
  }, [soundEnabled]);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'notification-' + Date.now(),
      });
    }
  }, [browserNotificationsEnabled]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return '📋';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '🔔';
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        (payload) => {
          const notification = payload.new as NotificationPayload;
          console.log('New notification received:', notification);
          
          // Invalidate queries to update notification center
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          
          // Play sound
          playSound();
          
          // Show toast notification
          const icon = getNotificationIcon(notification.type);
          toast(`${icon} ${notification.title}`, {
            description: notification.message,
            duration: 5000,
          });
          
          // Show browser notification
          showBrowserNotification(notification.title, notification.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, playSound, showBrowserNotification]);

  const requestBrowserPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  return {
    requestBrowserPermission,
  };
}
