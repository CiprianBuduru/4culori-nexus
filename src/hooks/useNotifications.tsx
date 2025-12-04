import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task_assigned';
  is_read: boolean;
  related_task_id: string | null;
  created_at: string;
}

export function useNotifications(userId?: string) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Notification[];
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      let query = supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

// Function to send task notification
export async function sendTaskNotification(data: {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  taskTitle: string;
  taskId: string;
  startDate: string;
  endDate: string;
  clientName?: string;
  operationName?: string;
}) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-task-notification', {
      body: data,
    });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error invoking notification function:', error);
    return { success: false, error };
  }
}

// Function to send order status change notification
export async function sendOrderStatusNotification(data: {
  orderId: string;
  orderNumber: string;
  orderName?: string;
  clientName?: string;
  previousStatus: string;
  newStatus: string;
  notifyEmail?: string;
}) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-order-notification', {
      body: data,
    });

    if (error) {
      console.error('Error sending order notification:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error invoking order notification function:', error);
    return { success: false, error };
  }
}
