import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProductionTasks, ProductionTaskInsert } from '@/hooks/useProductionTasks';
import { useDepartments } from '@/hooks/useDepartments';
import { useEmployees } from '@/hooks/useEmployees';
import { Calendar, Package, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Order {
  id: string;
  order_number: string;
  client_id: string | null;
  status: string;
  total_amount: number | null;
  notes: string | null;
  due_date: string | null;
  production_operations?: string[] | null;
  clients?: { name: string } | null;
}

interface TakeOrderDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TakeOrderDialog({ order, open, onOpenChange }: TakeOrderDialogProps) {
  const { addTask, addMultipleTasks } = useProductionTasks();
  const { departments, productionOperations } = useDepartments();
  const { employees } = useEmployees();
  
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notes, setNotes] = useState('');

  const productionDept = departments.find(d => d.name.toLowerCase().includes('producție') || d.name.toLowerCase().includes('productie'));

  // Filter employees by selected department
  const filteredEmployees = employees.filter(emp => {
    if (mode === 'single' && departmentId) {
      return emp.departmentId === departmentId;
    }
    // For multiple mode, show production department employees
    return productionDept ? emp.departmentId === productionDept.id : true;
  });

  const getOperationName = (id: string) => {
    return productionOperations.find(op => op.id === id)?.name || id;
  };

  const handleSubmit = async () => {
    if (!order || !startDate || !endDate) return;

    const clientName = order.clients?.name || null;

    if (mode === 'single') {
      // Single task for entire order
      const task: ProductionTaskInsert = {
        order_id: order.id,
        title: `Comandă #${order.order_number}`,
        description: order.notes || null,
        department_id: departmentId || productionDept?.id || '',
        assigned_to: assignedTo || null,
        start_date: startDate,
        end_date: endDate,
        status: 'pending',
        priority,
        client_name: clientName,
        quantity: null,
        notes,
        operation_name: null,
      };
      
      await addTask.mutateAsync(task);
    } else {
      // Multiple tasks - one per operation
      const operations = order.production_operations || [];
      
      if (operations.length === 0) {
        // No operations defined, create single task
        const task: ProductionTaskInsert = {
          order_id: order.id,
          title: `Comandă #${order.order_number}`,
          description: order.notes || null,
          department_id: productionDept?.id || '',
          assigned_to: assignedTo || null,
          start_date: startDate,
          end_date: endDate,
          status: 'pending',
          priority,
          client_name: clientName,
          quantity: null,
          notes,
          operation_name: null,
        };
        
        await addTask.mutateAsync(task);
      } else {
        // Create task for each operation
        const tasks: ProductionTaskInsert[] = operations.map((opId, index) => ({
          order_id: order.id,
          title: `${getOperationName(opId)} - #${order.order_number}`,
          description: order.notes || null,
          department_id: productionDept?.id || '',
          assigned_to: assignedTo || null,
          start_date: startDate,
          end_date: endDate,
          status: 'pending',
          priority,
          client_name: clientName,
          quantity: null,
          notes: `Pasul ${index + 1} din ${operations.length}${notes ? `. ${notes}` : ''}`,
          operation_name: getOperationName(opId),
        }));
        
        await addMultipleTasks.mutateAsync(tasks);
      }
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setMode('single');
    setStartDate('');
    setEndDate('');
    setDepartmentId('');
    setAssignedTo('');
    setPriority('medium');
    setNotes('');
  };

  const hasOperations = (order?.production_operations?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Preia Comanda #{order?.order_number}
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            {/* Client info */}
            {order.clients?.name && (
              <div className="text-sm text-muted-foreground">
                Client: <span className="font-medium text-foreground">{order.clients.name}</span>
              </div>
            )}

            {/* Mode selection - only show if order has operations */}
            {hasOperations && (
              <div className="space-y-2">
                <Label>Tip preluare</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'single' | 'multiple')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="font-normal cursor-pointer">
                      Un singur task pentru întreaga comandă
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiple" id="multiple" />
                    <Label htmlFor="multiple" className="font-normal cursor-pointer">
                      Task separat pentru fiecare operațiune ({order.production_operations?.length})
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Operations preview for multiple mode */}
            {mode === 'multiple' && hasOperations && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
                <p className="text-xs text-muted-foreground mb-2">Se vor crea task-uri pentru:</p>
                {order.production_operations?.map((opId, idx) => (
                  <div key={opId} className="text-sm">
                    {idx + 1}. {getOperationName(opId)}
                  </div>
                ))}
              </div>
            )}

            {/* Department selection - only for single mode */}
            {mode === 'single' && (
              <div className="space-y-2">
                <Label>Departament</Label>
                <Select value={departmentId} onValueChange={(val) => {
                  setDepartmentId(val);
                  setAssignedTo(''); // Reset employee when department changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează departament" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Employee assignment */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Responsabil (opțional)
              </Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează angajat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Neasignat</SelectItem>
                  {filteredEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {emp.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data început
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data sfârșit
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Prioritate</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Scăzută</SelectItem>
                  <SelectItem value="medium">Medie</SelectItem>
                  <SelectItem value="high">Ridicată</SelectItem>
                  <SelectItem value="urgent">Urgentă</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Note suplimentare</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note pentru producție..."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!startDate || !endDate || addTask.isPending || addMultipleTasks.isPending}
          >
            {addTask.isPending || addMultipleTasks.isPending ? 'Se salvează...' : 'Preia Comanda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
