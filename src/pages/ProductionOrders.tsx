import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Factory, Clock, AlertTriangle, Filter } from 'lucide-react';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useAuth } from '@/hooks/useAuth';
import { ORDER_STATUS_CONFIG, PRIORITY_CONFIG, ProductionOrderStatus, ProductionOrderPriority } from '@/types/productionOrders';
import { ProductionOrderCreateDialog } from '@/components/productionOrders/ProductionOrderCreateDialog';
import { ProductionOrderDetailDialog } from '@/components/productionOrders/ProductionOrderDetailDialog';
import { format, isPast, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';

export default function ProductionOrders() {
  const { orders, isLoading } = useProductionOrders();
  const { accessLevel } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const canManage = accessLevel >= 2; // sef_productie+

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = !search || 
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.client_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || o.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [orders, search, statusFilter, priorityFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Comenzi Producție</h1>
            <p className="text-muted-foreground">Gestionează comenzile și etapele de producție</p>
          </div>
          {canManage && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Comandă Nouă
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Caută comenzi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate ({statusCounts.all || 0})</SelectItem>
              {Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label} ({statusCounts[key] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Prioritate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-20 bg-muted/50" />
                <CardContent className="h-24 bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Factory className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              {search ? 'Nicio comandă găsită' : 'Nicio comandă de producție'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {search ? 'Încearcă o altă căutare' : 'Creează prima comandă de producție'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(order => {
              const statusCfg = ORDER_STATUS_CONFIG[order.status as ProductionOrderStatus] || ORDER_STATUS_CONFIG.nou;
              const priorityCfg = PRIORITY_CONFIG[order.priority as ProductionOrderPriority] || PRIORITY_CONFIG.normal;
              const isOverdue = order.due_date && isPast(parseISO(order.due_date)) && order.status !== 'finalizat';

              return (
                <Card
                  key={order.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${isOverdue ? 'border-destructive' : ''}`}
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-mono">#{order.order_number}</CardTitle>
                        <p className="text-sm font-medium text-foreground">{order.title}</p>
                        {order.client_name && (
                          <p className="text-xs text-muted-foreground">{order.client_name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                        <Badge className={priorityCfg.color}>{priorityCfg.label}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {order.due_date && (
                      <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        Termen: {format(parseISO(order.due_date), 'd MMM yyyy', { locale: ro })}
                        {isOverdue && ' (depășit)'}
                      </div>
                    )}
                    {order.quantity && (
                      <p className="text-xs text-muted-foreground">Cantitate: {order.quantity}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ProductionOrderCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      {selectedOrderId && (
        <ProductionOrderDetailDialog
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onOpenChange={(open) => !open && setSelectedOrderId(null)}
        />
      )}
    </MainLayout>
  );
}
