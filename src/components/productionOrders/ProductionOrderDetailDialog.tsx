import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useProductionOrders, useProductionStages } from '@/hooks/useProductionOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import {
  ORDER_STATUS_CONFIG,
  PRIORITY_CONFIG,
  STAGE_STATUS_CONFIG,
  PRODUCTION_DEPARTMENTS,
  ProductionOrderStatus,
  ProductionOrderPriority,
  StageStatus,
} from '@/types/productionOrders';
import { Plus, Trash2, Play, Pause, CheckCircle2, AlertOctagon, ChevronRight, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';

interface Props {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductionOrderDetailDialog({ orderId, open, onOpenChange }: Props) {
  const { orders, updateOrder } = useProductionOrders();
  const { stages, addStage, updateStage, deleteStage, completeStageAndAdvance } = useProductionStages(orderId);
  const { employees } = useEmployees();
  const { accessLevel } = useAuth();
  const canManage = accessLevel >= 2;

  const order = orders.find(o => o.id === orderId);

  // Add stage form
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  if (!order) return null;

  const statusCfg = ORDER_STATUS_CONFIG[order.status as ProductionOrderStatus] || ORDER_STATUS_CONFIG.nou;
  const priorityCfg = PRIORITY_CONFIG[order.priority as ProductionOrderPriority] || PRIORITY_CONFIG.normal;

  const handleAddStage = async () => {
    if (!newStageName || !newDeptName) return;
    const maxSeq = stages.length > 0 ? Math.max(...stages.map(s => s.sequence)) : 0;
    await addStage.mutateAsync({
      production_order_id: orderId,
      stage_name: newStageName,
      department_name: newDeptName,
      assigned_user_id: newAssignee || null,
      sequence: maxSeq + 1,
      status: stages.length === 0 ? 'de_preluat' : 'nou',
    });
    setNewStageName(''); setNewDeptName(''); setNewAssignee(''); setAddingStage(false);
  };

  const handleStageStatusChange = async (stageId: string, newStatus: StageStatus) => {
    if (newStatus === 'finalizat') {
      await completeStageAndAdvance.mutateAsync(stageId);
    } else {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'in_lucru') updates.started_at = new Date().toISOString();
      await updateStage.mutateAsync({ id: stageId, ...updates } as any);
    }
  };

  const handleOrderStatusChange = async (status: ProductionOrderStatus) => {
    await updateOrder.mutateAsync({ id: orderId, status });
  };

  const getEmployeeName = (id: string | null) => {
    if (!id) return 'Neasignat';
    return employees.find(e => e.id === id)?.name || 'Necunoscut';
  };

  const stageStatusActions = (stage: typeof stages[0]) => {
    const s = stage.status as StageStatus;
    const actions: { status: StageStatus; label: string; icon: typeof Play; variant: 'default' | 'outline' | 'destructive' }[] = [];
    
    if (s === 'nou' || s === 'de_preluat') {
      actions.push({ status: 'in_lucru', label: 'Începe', icon: Play, variant: 'default' });
    }
    if (s === 'in_lucru') {
      actions.push({ status: 'blocat', label: 'Blochează', icon: AlertOctagon, variant: 'destructive' });
      actions.push({ status: 'finalizat', label: 'Finalizează', icon: CheckCircle2, variant: 'default' });
    }
    if (s === 'blocat' || s === 'in_asteptare') {
      actions.push({ status: 'in_lucru', label: 'Reia', icon: Play, variant: 'default' });
    }
    return actions;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono text-lg">#{order.order_number}</span>
            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
            <Badge className={priorityCfg.color}>{priorityCfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Order Info */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{order.title}</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {order.client_name && <div><span className="text-muted-foreground">Client:</span> {order.client_name}</div>}
            {order.product_type && <div><span className="text-muted-foreground">Tip produs:</span> {order.product_type}</div>}
            <div><span className="text-muted-foreground">Cantitate:</span> {order.quantity}</div>
            {order.due_date && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Termen:</span> {format(parseISO(order.due_date), 'd MMM yyyy', { locale: ro })}
              </div>
            )}
            <div><span className="text-muted-foreground">Manager:</span> {getEmployeeName(order.production_manager_id)}</div>
          </div>
          {order.notes && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{order.notes}</p>}

          {/* Order status change */}
          {canManage && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Status comandă:</Label>
              <Select value={order.status} onValueChange={(v) => handleOrderStatusChange(v as ProductionOrderStatus)}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Stages Timeline */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Etape Producție</h3>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setAddingStage(!addingStage)}>
                <Plus className="h-3 w-3 mr-1" />
                Adaugă etapă
              </Button>
            )}
          </div>

          {/* Add stage form */}
          {addingStage && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nume etapă</Label>
                    <Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Ex: Print digital" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Departament</Label>
                    <Select value={newDeptName} onValueChange={setNewDeptName}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selectează" /></SelectTrigger>
                      <SelectContent>
                        {PRODUCTION_DEPARTMENTS.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsabil</Label>
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Opțional" /></SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.status === 'active').map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStage} disabled={!newStageName || !newDeptName}>Adaugă</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingStage(false)}>Anulează</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stage list */}
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nicio etapă definită încă.</p>
          ) : (
            <div className="space-y-2">
              {stages.map((stage, idx) => {
                const sCfg = STAGE_STATUS_CONFIG[stage.status as StageStatus] || STAGE_STATUS_CONFIG.nou;
                const actions = stageStatusActions(stage);
                return (
                  <div key={stage.id}>
                    <Card className={`transition-all ${stage.status === 'in_lucru' ? 'ring-2 ring-brand-teal/50' : ''} ${stage.status === 'blocat' ? 'ring-2 ring-destructive/50' : ''}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${stage.status === 'finalizat' ? 'bg-brand-green/20 text-brand-green' : 'bg-muted text-muted-foreground'}`}>
                              {stage.status === 'finalizat' ? '✓' : stage.sequence}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{stage.stage_name}</p>
                              <p className="text-xs text-muted-foreground">{stage.department_name} · {getEmployeeName(stage.assigned_user_id)}</p>
                              {stage.blocked_reason && (
                                <p className="text-xs text-destructive mt-0.5">Motiv blocare: {stage.blocked_reason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`${sCfg.color} text-[10px]`}>{sCfg.label}</Badge>
                            {actions.map(action => (
                              <Button
                                key={action.status}
                                variant={action.variant === 'destructive' ? 'destructive' : action.variant}
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => handleStageStatusChange(stage.id, action.status)}
                              >
                                <action.icon className="h-3 w-3 mr-1" />
                                {action.label}
                              </Button>
                            ))}
                            {canManage && stage.status !== 'finalizat' && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteStage.mutate(stage.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {stage.started_at && (
                          <p className="text-[10px] text-muted-foreground mt-1 ml-10">
                            Început: {format(parseISO(stage.started_at), 'd MMM HH:mm', { locale: ro })}
                            {stage.completed_at && ` · Finalizat: ${format(parseISO(stage.completed_at), 'd MMM HH:mm', { locale: ro })}`}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                    {idx < stages.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
