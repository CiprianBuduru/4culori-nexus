import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ShoppingCart, Calendar, User, Edit, Trash2, Paperclip } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OrderEditDialog } from '@/components/orders/OrderEditDialog';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  client_id: string | null;
  status: string;
  total_amount: number | null;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  attachment_url: string | null;
  production_operations: string[] | null;
  clients?: { name: string } | null;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'În așteptare', variant: 'secondary' },
  dtp: { label: 'DTP', variant: 'default' },
  waiting_bt: { label: 'În așteptare BT', variant: 'outline' },
  in_progress: { label: 'În lucru', variant: 'default' },
  completed: { label: 'Finalizată', variant: 'outline' },
  cancelled: { label: 'Anulată', variant: 'destructive' },
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(order => ({
        ...order,
        attachment_url: order.attachment_url || null,
        production_operations: order.production_operations || null
      })) as Order[];
      
      if (error) throw error;
      return data as Order[];
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Comandă ștearsă cu succes' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergerea comenzii', variant: 'destructive' });
    },
  });

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    setEditingOrder(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Comenzi</h1>
            <p className="text-muted-foreground mt-1">
              Gestionează comenzile clienților
            </p>
          </div>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Comandă Nouă
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Caută comenzi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-20 bg-muted/50" />
                <CardContent className="h-32 bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nicio comandă găsită</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery ? 'Încearcă o altă căutare' : 'Adaugă prima comandă'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const status = statusLabels[order.status] || statusLabels.pending;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-mono">
                          #{order.order_number}
                        </CardTitle>
                        {order.clients?.name && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {order.clients.name}
                          </p>
                        )}
                      </div>
                                                  <div className="flex items-center gap-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {order.attachment_url && (
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {order.due_date && (
                      <p className="text-sm flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Termen: {format(new Date(order.due_date), 'd MMM yyyy', { locale: ro })}
                      </p>
                    )}
                    {order.total_amount != null && (
                      <p className="text-lg font-semibold text-foreground">
                        {order.total_amount.toLocaleString('ro-RO')} RON
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {order.notes}
                      </p>
                    )}
                    <div className="flex gap-2 pt-3 border-t mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(order)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editează
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteOrder.mutate(order.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Șterge
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <OrderEditDialog
        order={editingOrder}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </MainLayout>
  );
}
