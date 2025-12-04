import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, eachDayOfInterval, isSameDay, isWithinInterval, startOfMonth, endOfMonth, addMonths, subMonths, isWeekend, startOfYear, endOfYear } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Trash2, User, CalendarDays, Users, Download } from 'lucide-react';
import { Employee } from '@/types';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Vacation {
  id: string;
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  notes: string | null;
}

interface VacationCalendarProps {
  employees: Employee[];
}

const vacationTypes = [
  { id: 'concediu', name: 'Concediu de odihnă', color: 'bg-blue-500', countsAgainstAllocation: true },
  { id: 'medical', name: 'Concediu medical', color: 'bg-red-500', countsAgainstAllocation: false },
  { id: 'personal', name: 'Zile personale', color: 'bg-orange-500', countsAgainstAllocation: true },
  { id: 'fara_plata', name: 'Concediu fără plată', color: 'bg-gray-500', countsAgainstAllocation: false },
];

// Calculate business days (excluding weekends)
const getBusinessDays = (startDate: Date, endDate: Date): number => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => !isWeekend(day)).length;
};

export function VacationCalendar({ employees }: VacationCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    type: 'concediu',
    notes: '',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vacations = [], isLoading } = useQuery({
    queryKey: ['vacations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacations')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as Vacation[];
    },
  });

  // Calculate used vacation days per employee for current year
  const employeeVacationStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date());
    const yearEnd = endOfYear(new Date());

    return employees.map(emp => {
      // Filter vacations for this employee that count against allocation
      const empVacations = vacations.filter(v => 
        v.employee_id === emp.id && 
        vacationTypes.find(t => t.id === v.type)?.countsAgainstAllocation
      );

      // Calculate total used days
      let usedDays = 0;
      empVacations.forEach(v => {
        const start = new Date(v.start_date);
        const end = new Date(v.end_date);
        
        // Only count days within current year
        const effectiveStart = start < yearStart ? yearStart : start;
        const effectiveEnd = end > yearEnd ? yearEnd : end;
        
        if (effectiveStart <= effectiveEnd) {
          usedDays += getBusinessDays(effectiveStart, effectiveEnd);
        }
      });

      const allocated = emp.vacationDays || 21; // Default 21 days if not set
      const remaining = Math.max(0, allocated - usedDays);

      return {
        employee: emp,
        allocated,
        used: usedDays,
        remaining,
        percentage: allocated > 0 ? Math.min(100, (usedDays / allocated) * 100) : 0,
      };
    }).filter(stat => stat.employee.status === 'active').sort((a, b) => b.percentage - a.percentage);
  }, [employees, vacations]);

  // Export to Excel function
  const exportToExcel = () => {
    const currentYear = new Date().getFullYear();
    
    // Sheet 1: Employee Summary
    const summaryData = employeeVacationStats.map(stat => ({
      'Angajat': stat.employee.name,
      'Zile Alocate': stat.allocated,
      'Zile Folosite': stat.used,
      'Zile Rămase': stat.remaining,
      'Procent Utilizat': `${Math.round(stat.percentage)}%`,
    }));

    // Sheet 2: Vacation Details
    const detailsData = vacations.map(v => {
      const businessDays = getBusinessDays(new Date(v.start_date), new Date(v.end_date));
      const typeName = vacationTypes.find(t => t.id === v.type)?.name || v.type;
      return {
        'Angajat': v.employee_name,
        'Tip Concediu': typeName,
        'Data Început': format(new Date(v.start_date), 'dd.MM.yyyy'),
        'Data Sfârșit': format(new Date(v.end_date), 'dd.MM.yyyy'),
        'Zile Lucrătoare': businessDays,
        'Status': v.status === 'approved' ? 'Aprobat' : v.status,
        'Note': v.notes || '',
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add summary sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Sumar Angajați');
    
    // Add details sheet
    const wsDetails = XLSX.utils.json_to_sheet(detailsData);
    wsDetails['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalii Concedii');

    // Download file
    XLSX.writeFile(wb, `Raport_Concedii_${currentYear}.xlsx`);
    toast({ title: 'Raport exportat cu succes' });
  };

  const addVacation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const employee = employees.find(e => e.id === data.employee_id);
      const { error } = await supabase.from('vacations').insert({
        employee_id: data.employee_id,
        employee_name: employee?.name || 'Necunoscut',
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        status: 'approved',
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toast({ title: 'Concediu adăugat cu succes' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'Eroare la adăugarea concediului', variant: 'destructive' });
    },
  });

  const deleteVacation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vacations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toast({ title: 'Concediu șters' });
      setSelectedVacation(null);
    },
    onError: () => {
      toast({ title: 'Eroare la ștergerea concediului', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      employee_id: '',
      start_date: '',
      end_date: '',
      type: 'concediu',
      notes: '',
    });
  };

  const getVacationsForDay = (date: Date) => {
    return vacations.filter(v => {
      const start = new Date(v.start_date);
      const end = new Date(v.end_date);
      return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
    });
  };

  const getVacationColor = (type: string) => {
    return vacationTypes.find(t => t.id === type)?.color || 'bg-blue-500';
  };

  const getVacationTypeName = (type: string) => {
    return vacationTypes.find(t => t.id === type)?.name || type;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get all vacations that overlap with current month
  const monthVacations = vacations.filter(v => {
    const start = new Date(v.start_date);
    const end = new Date(v.end_date);
    return (start <= monthEnd && end >= monthStart);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ro })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adaugă Concediu
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {vacationTypes.map(type => (
          <div key={type.id} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', type.color)} />
            <span className="text-sm text-muted-foreground">{type.name}</span>
          </div>
        ))}
      </div>

      {/* Employee Vacation Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Zile Concediu {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employeeVacationStats.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">Niciun angajat cu zile de concediu alocate</p>
            ) : (
              employeeVacationStats.map(stat => (
                <div key={stat.employee.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{stat.employee.name}</span>
                    <Badge variant={stat.remaining > 5 ? 'outline' : stat.remaining > 0 ? 'secondary' : 'destructive'}>
                      {stat.remaining} zile
                    </Badge>
                  </div>
                  <Progress value={stat.percentage} className="h-2 mb-1" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Folosite: {stat.used}</span>
                    <span>Total: {stat.allocated}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar with vacations list */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ro}
              className="w-full pointer-events-auto"
              classNames={{
                months: "w-full",
                month: "w-full",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "flex-1 text-muted-foreground font-normal text-sm py-2",
                row: "flex w-full",
                cell: "flex-1 relative p-0 text-center focus-within:relative",
                day: "h-16 w-full p-1 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
              }}
              components={{
                Day: ({ date, ...props }) => {
                  const dayVacations = getVacationsForDay(date);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  
                  return (
                    <div 
                      className={cn(
                        "h-16 w-full p-1 rounded-md transition-colors cursor-pointer hover:bg-muted",
                        !isCurrentMonth && "opacity-40"
                      )}
                      onClick={() => {
                        if (dayVacations.length > 0) {
                          setSelectedVacation(dayVacations[0]);
                        }
                      }}
                    >
                      <span className={cn(
                        "text-sm",
                        isSameDay(date, new Date()) && "font-bold text-primary"
                      )}>
                        {date.getDate()}
                      </span>
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {dayVacations.slice(0, 3).map((v, i) => (
                          <div
                            key={v.id + i}
                            className={cn('w-2 h-2 rounded-full', getVacationColor(v.type))}
                            title={v.employee_name}
                          />
                        ))}
                        {dayVacations.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{dayVacations.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Vacations list for current month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Concedii în {format(currentMonth, 'MMMM', { locale: ro })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Se încarcă...</p>
            ) : monthVacations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun concediu în această lună</p>
            ) : (
              monthVacations.map(vacation => (
                <div
                  key={vacation.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedVacation(vacation)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full flex-shrink-0', getVacationColor(vacation.type))} />
                      <span className="font-medium text-sm">{vacation.employee_name}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-5">
                    {format(new Date(vacation.start_date), 'd MMM', { locale: ro })} - {format(new Date(vacation.end_date), 'd MMM yyyy', { locale: ro })}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Vacation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adaugă Concediu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Angajat *</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData(prev => ({ ...prev, employee_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează angajat" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'active').map(emp => {
                    const stat = employeeVacationStats.find(s => s.employee.id === emp.id);
                    return (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span>{emp.name}</span>
                          {stat && (
                            <span className="text-xs text-muted-foreground">
                              ({stat.remaining} zile rămase)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data început *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Data sfârșit *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tip concediu</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vacationTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', type.color)} />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Detalii suplimentare..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">
                Anulează
              </Button>
              <Button 
                onClick={() => addVacation.mutate(formData)}
                disabled={!formData.employee_id || !formData.start_date || !formData.end_date || addVacation.isPending}
                className="flex-1"
              >
                {addVacation.isPending ? 'Se salvează...' : 'Salvează'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vacation Details Dialog */}
      <Dialog open={!!selectedVacation} onOpenChange={() => setSelectedVacation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalii Concediu</DialogTitle>
          </DialogHeader>
          {selectedVacation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-10 w-10 text-muted-foreground p-2 bg-muted rounded-full" />
                <div>
                  <p className="font-semibold">{selectedVacation.employee_name}</p>
                  <Badge className={cn('mt-1', getVacationColor(selectedVacation.type).replace('bg-', 'bg-opacity-20 text-').replace('-500', '-700'))}>
                    {getVacationTypeName(selectedVacation.type)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data început</p>
                  <p className="font-medium">{format(new Date(selectedVacation.start_date), 'd MMMM yyyy', { locale: ro })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data sfârșit</p>
                  <p className="font-medium">{format(new Date(selectedVacation.end_date), 'd MMMM yyyy', { locale: ro })}</p>
                </div>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground">Zile lucrătoare</p>
                <p className="font-medium">
                  {getBusinessDays(new Date(selectedVacation.start_date), new Date(selectedVacation.end_date))} zile
                </p>
              </div>

              {selectedVacation.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Note</p>
                  <p>{selectedVacation.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedVacation(null)} className="flex-1">
                  Închide
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteVacation.mutate(selectedVacation.id)}
                  disabled={deleteVacation.isPending}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Șterge
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
