import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductionTask {
  id: string;
  order_id: string | null;
  title: string;
  description: string | null;
  department_id: string;
  assigned_to: string | null;
  start_date: string;
  end_date: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  client_name: string | null;
  quantity: number | null;
  notes: string | null;
  operation_name: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductionTaskInsert = Omit<ProductionTask, 'id' | 'created_at' | 'updated_at'>;

export function useProductionTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['production-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_tasks')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as ProductionTask[];
    },
  });

  const addTask = useMutation({
    mutationFn: async (task: ProductionTaskInsert) => {
      const { data, error } = await supabase
        .from('production_tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
      toast({ title: 'Task adăugat în calendar' });
    },
    onError: () => {
      toast({ title: 'Eroare la adăugarea task-ului', variant: 'destructive' });
    },
  });

  const addMultipleTasks = useMutation({
    mutationFn: async (tasksToAdd: ProductionTaskInsert[]) => {
      const { data, error } = await supabase
        .from('production_tasks')
        .insert(tasksToAdd)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
      toast({ title: `${data.length} task-uri adăugate în calendar` });
    },
    onError: () => {
      toast({ title: 'Eroare la adăugarea task-urilor', variant: 'destructive' });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('production_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
      toast({ title: 'Task actualizat' });
    },
    onError: () => {
      toast({ title: 'Eroare la actualizarea task-ului', variant: 'destructive' });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('production_tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-tasks'] });
      toast({ title: 'Task șters' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergerea task-ului', variant: 'destructive' });
    },
  });

  return {
    tasks,
    isLoading,
    addTask,
    addMultipleTasks,
    updateTask,
    deleteTask,
  };
}
