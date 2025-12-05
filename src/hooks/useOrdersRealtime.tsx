import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  name: string | null;
  document_type: string;
  status: string;
  client_id: string | null;
}

export function useOrdersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as Order;
          console.log('New order received:', order);
          
          // Invalidate orders queries
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          
          // Show toast based on document type
          const isOffer = order.document_type === 'oferta';
          const icon = isOffer ? '📄' : '📦';
          const type = isOffer ? 'Ofertă nouă' : 'Comandă nouă';
          
          toast(`${icon} ${type}`, {
            description: `${order.order_number}${order.name ? ` - ${order.name}` : ''}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as Order;
          const oldOrder = payload.old as Order;
          
          // Only notify on status changes
          if (order.status !== oldOrder.status) {
            console.log('Order status changed:', order);
            
            // Invalidate orders queries
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            
            toast('🔄 Status actualizat', {
              description: `${order.order_number}: ${oldOrder.status} → ${order.status}`,
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
