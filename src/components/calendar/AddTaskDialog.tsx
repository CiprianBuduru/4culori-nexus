import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { ProductionTaskInsert } from '@/hooks/useProductionTasks';

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  departmentId: string;
  avatar?: string;
}

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: ProductionTaskInsert) => Promise<void>;
  departments: Department[];
  employees: Employee[];
  allowedDepartmentIds: string[];
  isLoading?: boolean;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onAddTask,
  departments,
  employees,
  allowedDepartmentIds,
  isLoading = false,
}: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');

  const filteredDepartments = departments.filter(d => allowedDepartmentIds.includes(d.id));
  const filteredEmployees = departmentId 
    ? employees.filter(e => e.departmentId === departmentId)
    : [];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDepartmentId('');
    setAssignedTo('');
    setStartDate('');
    setEndDate('');
    setPriority('medium');
    setClientName('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!title || !departmentId || !startDate || !endDate) return;

    await onAddTask({
      title,
      description: description || null,
      department_id: departmentId,
      assigned_to: assignedTo || null,
      start_date: startDate,
      end_date: endDate,
      status: 'pending',
      priority,
      client_name: clientName || null,
      notes: notes || null,
      order_id: null,
      quantity: null,
      operation_name: null,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Set default dates to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adaugă Task Nou
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titlu *</Label>
            <Input
              id="title"
              placeholder="Numele task-ului"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descriere</Label>
            <Textarea
              id="description"
              placeholder="Descriere opțională"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Departament *</Label>
              <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setAssignedTo(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează" />
                </SelectTrigger>
                <SelectContent>
                  {filteredDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsabil</Label>
              <Select 
                value={assignedTo || 'unassigned'} 
                onValueChange={(v) => setAssignedTo(v === 'unassigned' ? '' : v)} 
                disabled={!departmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={departmentId ? "Selectează" : "Alege departament"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Neasignat</SelectItem>
                  {filteredEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data început *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate || today}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data sfârșit *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate || today}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioritate</Label>
              <Select value={priority} onValueChange={(v: 'low' | 'medium' | 'high' | 'urgent') => setPriority(v)}>
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

            <div className="space-y-2">
              <Label htmlFor="clientName">Client</Label>
              <Input
                id="clientName"
                placeholder="Nume client (opțional)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              placeholder="Note adiționale"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Anulează
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!title || !departmentId || !startDate || !endDate || isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adaugă Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
