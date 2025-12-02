import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const orderSchema = z.object({
  order_number: z.string().min(1, 'Numărul comenzii este obligatoriu'),
  client_id: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  total_amount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  due_date: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface Order {
  id: string;
  order_number: string;
  client_id: string | null;
  status: string;
  total_amount: number | null;
  notes: string | null;
  due_date: string | null;
}

interface OrderEditDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      order_number: '',
      client_id: '',
      status: 'pending',
      total_amount: 0,
      notes: '',
      due_date: '',
    },
  });

  useEffect(() => {
    if (order) {
      form.reset({
        order_number: order.order_number,
        client_id: order.client_id || '',
        status: order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        total_amount: order.total_amount || 0,
        notes: order.notes || '',
        due_date: order.due_date || '',
      });
    } else {
      const nextOrderNumber = `CMD-${Date.now().toString().slice(-6)}`;
      form.reset({
        order_number: nextOrderNumber,
        client_id: '',
        status: 'pending',
        total_amount: 0,
        notes: '',
        due_date: '',
      });
    }
  }, [order, form]);

  const mutation = useMutation({
    mutationFn: async (data: OrderFormData) => {
      const payload = {
        order_number: data.order_number,
        client_id: data.client_id || null,
        status: data.status,
        total_amount: data.total_amount || 0,
        notes: data.notes || null,
        due_date: data.due_date || null,
      };

      if (order) {
        const { error } = await supabase
          .from('orders')
          .update(payload)
          .eq('id', order.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('orders').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: order ? 'Comandă actualizată' : 'Comandă adăugată' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Eroare la salvarea comenzii', variant: 'destructive' });
    },
  });

  const onSubmit = (data: OrderFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{order ? 'Editează Comandă' : 'Comandă Nouă'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Număr Comandă *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="CMD-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">În așteptare</SelectItem>
                        <SelectItem value="in_progress">În lucru</SelectItem>
                        <SelectItem value="completed">Finalizată</SelectItem>
                        <SelectItem value="cancelled">Anulată</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valoare (RON)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Termen Livrare</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Detalii comandă..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Anulează
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                {mutation.isPending ? 'Se salvează...' : 'Salvează'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
