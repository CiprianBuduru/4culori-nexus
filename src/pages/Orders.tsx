import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ShoppingCart, Calendar, User, Edit, Trash2, Paperclip, PlayCircle, FileText, Filter, ArrowRightLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OrderEditDialog } from '@/components/orders/OrderEditDialog';
import { TakeOrderDialog } from '@/components/orders/TakeOrderDialog';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  document_type: 'oferta' | 'comanda';
  clients?: { name: string } | null;
}

type DocumentType = 'oferta' | 'comanda';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Nouă', variant: 'secondary' },
  dtp: { label: 'La DTP', variant: 'default' },
  waiting_bt: { label: 'Așteptare BT', variant: 'outline' },
  bt_approved: { label: 'BT Aprobat', variant: 'default' },
  production: { label: 'În Producție', variant: 'default' },
  ready_for_delivery: { label: 'Gata de Livrare', variant: 'secondary' },
  delivered: { label: 'Livrată', variant: 'outline' },
  completed: { label: 'Finalizată', variant: 'outline' },
  cancelled: { label: 'Anulată', variant: 'destructive' },
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [takeOrderDialogOpen, setTakeOrderDialogOpen] = useState(false);
  const [orderToTake, setOrderToTake] = useState<Order | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<DocumentType>('comanda');
  const [filterType, setFilterType] = useState<'all' | 'oferta' | 'comanda'>('all');
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
        production_operations: order.production_operations || null,
        document_type: order.document_type || 'comanda'
      })) as Order[];
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Șters cu succes' });
    },
    onError: () => {
      toast({ title: 'Eroare la ștergere', variant: 'destructive' });
    },
  });

  const convertToOrder = useMutation({
    mutationFn: async (id: string) => {
      // Generate new order number with CMD prefix
      const newOrderNumber = `CMD-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase
        .from('orders')
        .update({ 
          document_type: 'comanda',
          order_number: newOrderNumber
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({ title: 'Oferta a fost convertită în comandă', description: 'Acum poți prelua comanda pentru producție.' });
    },
    onError: () => {
      toast({ title: 'Eroare la conversie', variant: 'destructive' });
    },
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || order.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddNew = (type: DocumentType) => {
    setNewDocumentType(type);
    setEditingOrder(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleTakeOrder = (order: Order) => {
    setOrderToTake(order);
    setTakeOrderDialogOpen(true);
  };

  const offerCount = orders.filter(o => o.document_type === 'oferta').length;
  const orderCount = orders.filter(o => o.document_type === 'comanda').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Oferte / Comenzi</h1>
            <p className="text-muted-foreground mt-1">
              Gestionează ofertele și comenzile clienților
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleAddNew('oferta')} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Ofertă Nouă
            </Button>
            <Button onClick={() => handleAddNew('comanda')} className="gap-2">
              <Plus className="h-4 w-4" />
              Comandă Nouă
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Caută oferte/comenzi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <TabsList>
              <TabsTrigger value="all">Toate ({orders.length})</TabsTrigger>
              <TabsTrigger value="oferta">Oferte ({offerCount})</TabsTrigger>
              <TabsTrigger value="comanda">Comenzi ({orderCount})</TabsTrigger>
            </TabsList>
          </Tabs>
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
            <h3 className="mt-4 text-lg font-semibold">
              {filterType === 'oferta' ? 'Nicio ofertă găsită' : filterType === 'comanda' ? 'Nicio comandă găsită' : 'Nimic găsit'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery ? 'Încearcă o altă căutare' : 'Adaugă prima ofertă sau comandă'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const status = statusLabels[order.status] || statusLabels.pending;
              const isOffer = order.document_type === 'oferta';
              return (
                <Card key={order.id} className={`hover:shadow-md transition-shadow ${isOffer ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isOffer ? 'outline' : 'default'} className={isOffer ? 'border-blue-500 text-blue-600' : 'bg-green-600'}>
                            {isOffer ? 'Ofertă' : 'Comandă'}
                          </Badge>
                          <CardTitle className="text-lg font-mono">
                            #{order.order_number}
                          </CardTitle>
                        </div>
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
                        {order.total_amount.toLocaleString('ro-RO')} €
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {order.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-3 border-t mt-3">
                      {isOffer && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => convertToOrder.mutate(order.id)}
                          disabled={convertToOrder.isPending}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1" />
                          Convertește în Comandă
                        </Button>
                      )}
                      {!isOffer && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => handleTakeOrder(order)}
                          disabled={order.status === 'completed' || order.status === 'cancelled'}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Preia
                        </Button>
                      )}
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
        documentType={editingOrder?.document_type || newDocumentType}
      />

      <TakeOrderDialog
        order={orderToTake}
        open={takeOrderDialogOpen}
        onOpenChange={setTakeOrderDialogOpen}
      />
    </MainLayout>
  );
}
