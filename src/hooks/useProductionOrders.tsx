import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProductionOrder, ProductionStage, ProductionOrderStatus, StageStatus } from '@/types/productionOrders';

export function useProductionOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductionOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: Partial<ProductionOrder>) => {
      const { data, error } = await supabase
        .from('production_orders')
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Comandă de producție creată' });
    },
    onError: () => {
      toast({ title: 'Eroare la creare', variant: 'destructive' });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from('production_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Comandă actualizată' });
    },
    onError: () => {
      toast({ title: 'Eroare la actualizare', variant: 'destructive' });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Comandă ștearsă' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergere', variant: 'destructive' });
    },
  });

  return { orders, isLoading, createOrder, updateOrder, deleteOrder };
}

export function useProductionStages(orderId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['production-stages', orderId],
    queryFn: async () => {
      let query = supabase
        .from('production_stages')
        .select('*')
        .order('sequence', { ascending: true });
      
      if (orderId) {
        query = query.eq('production_order_id', orderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ProductionStage[];
    },
    enabled: !!orderId || orderId === undefined,
  });

  const addStage = useMutation({
    mutationFn: async (stage: Partial<ProductionStage>) => {
      const { data, error } = await supabase
        .from('production_stages')
        .insert(stage)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-stages'] });
      toast({ title: 'Etapă adăugată' });
    },
    onError: () => {
      toast({ title: 'Eroare la adăugarea etapei', variant: 'destructive' });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProductionStage> & { id: string }) => {
      const { data, error } = await supabase
        .from('production_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-stages'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    },
    onError: () => {
      toast({ title: 'Eroare la actualizarea etapei', variant: 'destructive' });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-stages'] });
      toast({ title: 'Etapă ștearsă' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergerea etapei', variant: 'destructive' });
    },
  });

  // Advance stage: mark current as finalizat, activate next
  const completeStageAndAdvance = useMutation({
    mutationFn: async (stageId: string) => {
      const stage = stages.find(s => s.id === stageId);
      if (!stage) throw new Error('Stage not found');

      // Complete current stage
      await supabase
        .from('production_stages')
        .update({ status: 'finalizat', completed_at: new Date().toISOString() })
        .eq('id', stageId);

      // Find next stage
      const nextStage = stages.find(s => s.sequence === stage.sequence + 1);
      if (nextStage) {
        await supabase
          .from('production_stages')
          .update({ status: 'de_preluat' })
          .eq('id', nextStage.id);
      }

      // Check if all stages are done → update order status
      const allOtherDone = stages
        .filter(s => s.id !== stageId)
        .every(s => s.status === 'finalizat');
      
      if (allOtherDone && !nextStage) {
        await supabase
          .from('production_orders')
          .update({ status: 'finalizat' })
          .eq('id', stage.production_order_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-stages'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Etapă finalizată' });
    },
    onError: () => {
      toast({ title: 'Eroare', variant: 'destructive' });
    },
  });

  return { stages, isLoading, addStage, updateStage, deleteStage, completeStageAndAdvance };
}

// Hook for operator's assigned stages across all orders
export function useMyStages(employeeId?: string) {
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['my-stages', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_stages')
        .select('*, production_orders!inner(order_number, title, client_name, priority, due_date, status)')
        .eq('assigned_user_id', employeeId!)
        .neq('status', 'finalizat')
        .order('sequence', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  return { stages, isLoading };
}
