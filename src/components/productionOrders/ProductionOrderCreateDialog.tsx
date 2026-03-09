import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { PRIORITY_CONFIG, PRODUCTION_DEPARTMENTS, ProductionOrderPriority } from '@/types/productionOrders';
import { addDays, format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductionOrderCreateDialog({ open, onOpenChange }: Props) {
  const { createOrder } = useProductionOrders();
  const { employees } = useEmployees();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<ProductionOrderPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [managerId, setManagerId] = useState('');

  const handlePriorityChange = (p: ProductionOrderPriority) => {
    setPriority(p);
    // Auto-suggest due date based on SLA
    const sla = PRIORITY_CONFIG[p].slaDays;
    setDueDate(format(addDays(new Date(), sla), 'yyyy-MM-dd'));
  };

  const handleSubmit = async () => {
    if (!title) return;
    await createOrder.mutateAsync({
      title,
      client_name: clientName || null,
      product_type: productType || null,
      quantity,
      priority,
      due_date: dueDate || null,
      notes: notes || null,
      production_manager_id: managerId || null,
      status: managerId ? 'de_preluat' : 'nou',
    });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTitle(''); setClientName(''); setProductType(''); setQuantity(1);
    setPriority('normal'); setDueDate(''); setNotes(''); setManagerId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Comandă Producție Nouă</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titlu *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: 500 tricouri personalizate" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nume client" />
            </div>
            <div className="space-y-2">
              <Label>Tip produs</Label>
              <Input value={productType} onChange={e => setProductType(e.target.value)} placeholder="Ex: Tricouri" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cantitate</Label>
              <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label>Prioritate</Label>
              <Select value={priority} onValueChange={(v) => handlePriorityChange(v as ProductionOrderPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label} (SLA: {cfg.slaDays} zile)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Termen livrare</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Responsabil producție</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger><SelectValue placeholder="Selectează" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'active').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Detalii suplimentare..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={handleSubmit} disabled={!title || createOrder.isPending}>
            {createOrder.isPending ? 'Se creează...' : 'Creează'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
