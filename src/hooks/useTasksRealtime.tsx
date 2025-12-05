import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProductionTask {
  id: string;
  title: string;
  department_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  client_name: string | null;
  operation_name: string | null;
}

export function useTasksRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tasks')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'production_tasks',
        },
        (payload) => {
          const task = payload.new as ProductionTask;
          console.log('New task received:', task);
          
          // Invalidate tasks queries
          queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
          
          // Show toast
          const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          
          toast(`📋 Task nou`, {
            description: `${priorityIcon} ${task.title}${task.client_name ? ` - ${task.client_name}` : ''}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'production_tasks',
        },
        (payload) => {
          const task = payload.new as ProductionTask;
          const oldTask = payload.old as ProductionTask;
          
          // Invalidate tasks queries
          queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
          
          // Notify on status changes
          if (task.status !== oldTask.status) {
            const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⏳';
            
            toast(`${statusIcon} Status task actualizat`, {
              description: `${task.title}: ${oldTask.status} → ${task.status}`,
              duration: 4000,
            });
          }
          
          // Notify on assignment changes
          if (task.assigned_to !== oldTask.assigned_to && task.assigned_to) {
            toast('👤 Task reatribuit', {
              description: task.title,
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
