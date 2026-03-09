import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMyStages, useProductionStages } from '@/hooks/useProductionOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { STAGE_STATUS_CONFIG, PRIORITY_CONFIG, StageStatus } from '@/types/productionOrders';
import { Play, CheckCircle2, AlertOctagon, Clock, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function MyOperations() {
  const { user } = useAuth();
  const { employees } = useEmployees();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Find employee record for current user
  const currentEmployee = useMemo(() => {
    if (!user?.email) return null;
    return employees.find(e => e.email === user.email);
  }, [user, employees]);

  const { stages, isLoading } = useMyStages(currentEmployee?.id);

  const handleStatusChange = async (stageId: string, newStatus: StageStatus, productionOrderId: string) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'in_lucru') updates.started_at = new Date().toISOString();
      if (newStatus === 'finalizat') updates.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from('production_stages')
        .update(updates)
        .eq('id', stageId);

      if (error) throw error;

      // If completing, check if there's a next stage to activate
      if (newStatus === 'finalizat') {
        const { data: allStages } = await supabase
          .from('production_stages')
          .select('*')
          .eq('production_order_id', productionOrderId)
          .order('sequence');
        
        if (allStages) {
          const currentStage = allStages.find(s => s.id === stageId);
          const nextStage = allStages.find(s => s.sequence === (currentStage?.sequence || 0) + 1);
          if (nextStage) {
            await supabase.from('production_stages').update({ status: 'de_preluat' }).eq('id', nextStage.id);
          }
          // If all done, finalize order
          const allDone = allStages.every(s => s.id === stageId || s.status === 'finalizat');
          if (allDone) {
            await supabase.from('production_orders').update({ status: 'finalizat' }).eq('id', productionOrderId);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['my-stages'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast({ title: 'Status actualizat' });
    } catch {
      toast({ title: 'Eroare', variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Operațiunile Mele</h1>
          <p className="text-muted-foreground">Etapele de producție asignate ție</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="h-20" /></Card>
            ))}
          </div>
        ) : stages.length === 0 ? (
          <Card className="p-12 text-center">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nicio operațiune asignată</h3>
            <p className="text-muted-foreground mt-1">Nu ai etape active în acest moment.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {stages.map((stage: any) => {
              const sCfg = STAGE_STATUS_CONFIG[stage.status as StageStatus] || STAGE_STATUS_CONFIG.nou;
              const orderData = stage.production_orders;
              const pCfg = PRIORITY_CONFIG[orderData?.priority] || PRIORITY_CONFIG.normal;
              const s = stage.status as StageStatus;

              return (
                <Card key={stage.id} className={`${s === 'in_lucru' ? 'ring-2 ring-brand-teal/50' : ''} ${s === 'blocat' ? 'ring-2 ring-destructive/50' : ''}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{stage.stage_name}</p>
                          <Badge className={sCfg.color}>{sCfg.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {stage.department_name} · Comandă #{orderData?.order_number}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {orderData?.title && <span>{orderData.title}</span>}
                          {orderData?.client_name && <span>· {orderData.client_name}</span>}
                          <Badge className={`${pCfg.color} text-[10px]`}>{pCfg.label}</Badge>
                          {orderData?.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(parseISO(orderData.due_date), 'd MMM', { locale: ro })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(s === 'nou' || s === 'de_preluat') && (
                          <Button size="sm" onClick={() => handleStatusChange(stage.id, 'in_lucru', stage.production_order_id)}>
                            <Play className="h-3 w-3 mr-1" /> Începe
                          </Button>
                        )}
                        {s === 'in_lucru' && (
                          <>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusChange(stage.id, 'blocat', stage.production_order_id)}>
                              <AlertOctagon className="h-3 w-3 mr-1" /> Blochează
                            </Button>
                            <Button size="sm" onClick={() => handleStatusChange(stage.id, 'finalizat', stage.production_order_id)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Finalizează
                            </Button>
                          </>
                        )}
                        {(s === 'blocat' || s === 'in_asteptare') && (
                          <Button size="sm" onClick={() => handleStatusChange(stage.id, 'in_lucru', stage.production_order_id)}>
                            <Play className="h-3 w-3 mr-1" /> Reia
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
