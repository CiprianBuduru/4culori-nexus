import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  Clock,
  User,
  Package
} from 'lucide-react';
import { departments } from '@/data/mockData';
import { productionTasks } from '@/data/productionData';
import { 
  ProductionTask, 
  productionStatusLabels, 
  productionStatusColors,
  priorityLabels 
} from '@/types/production';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const departmentColors: Record<string, string> = {
  '1': 'bg-brand-blue',
  '2': 'bg-brand-teal',
  '3': 'bg-brand-orange',
  '4': 'bg-brand-green',
};

const departmentBorderColors: Record<string, string> = {
  '1': 'border-l-brand-blue',
  '2': 'border-l-brand-teal',
  '3': 'border-l-brand-orange',
  '4': 'border-l-brand-green',
};

export default function ProductionCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get days for the smart layout
  const { 
    primaryDays, 
    secondaryDays, 
    remainingDays, 
    monthName, 
    year 
  } = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Calculate days relative to today
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    // Primary days: today, tomorrow, day after tomorrow
    const primary: Date[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + i);
      primary.push(d);
    }

    // Secondary days: next 2 days after primary
    const secondary: Date[] = [];
    for (let i = 3; i < 5; i++) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() + i);
      secondary.push(d);
    }

    // Remaining days of the current month (excluding primary and secondary)
    const remaining: Date[] = [];
    const usedDates = new Set([...primary, ...secondary].map(d => d.toDateString()));
    
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (!usedDates.has(d.toDateString())) {
        remaining.push(d);
      }
    }

    return {
      primaryDays: primary,
      secondaryDays: secondary,
      remainingDays: remaining,
      monthName: firstDay.toLocaleDateString('ro-RO', { month: 'long' }),
      year,
    };
  }, [currentDate]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return productionTasks.filter(task => 
      selectedDepartment === 'all' || task.departmentId === selectedDepartment
    );
  }, [selectedDepartment]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): ProductionTask[] => {
    const dateStr = date.toISOString().split('T')[0];
    
    return filteredTasks.filter(task => {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if date is today
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && 
           date.getFullYear() === currentDate.getFullYear();
  };

  const getDepartmentName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || 'Necunoscut';
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('ro-RO', { weekday: 'short' });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
  };

  // Render task item
  const TaskItem = ({ task, compact = false }: { task: ProductionTask; compact?: boolean }) => (
    <button
      onClick={() => setSelectedTask(task)}
      className={`
        w-full text-left p-2 rounded-lg border-l-4 ${departmentBorderColors[task.departmentId]}
        bg-muted/50 hover:bg-muted transition-colors
        ${compact ? 'text-xs' : 'text-sm'}
      `}
    >
      <div className="font-medium truncate">{task.title}</div>
      {!compact && (
        <div className="flex items-center gap-2 mt-1 text-muted-foreground text-xs">
          <Badge className={`${productionStatusColors[task.status]} text-[10px] px-1.5 py-0`}>
            {productionStatusLabels[task.status]}
          </Badge>
          {task.clientName && <span className="truncate">{task.clientName}</span>}
        </div>
      )}
    </button>
  );

  // Render day column
  const DayColumn = ({ 
    date, 
    size = 'large' 
  }: { 
    date: Date; 
    size?: 'large' | 'medium' | 'small' 
  }) => {
    const tasks = getTasksForDate(date);
    const inCurrentMonth = isCurrentMonth(date);
    const dayIsToday = isToday(date);

    const maxTasks = size === 'large' ? Infinity : size === 'medium' ? 5 : 2;
    const visibleTasks = tasks.slice(0, maxTasks);
    const hiddenCount = tasks.length - visibleTasks.length;

    return (
      <div
        className={`
          rounded-xl border bg-card p-3 flex flex-col
          ${dayIsToday ? 'ring-2 ring-primary shadow-lg' : ''}
          ${!inCurrentMonth ? 'opacity-50' : ''}
          ${size === 'large' ? 'min-h-[400px]' : size === 'medium' ? 'min-h-[200px]' : 'min-h-[80px]'}
        `}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className={`text-xs uppercase font-medium ${dayIsToday ? 'text-primary' : 'text-muted-foreground'}`}>
              {formatDayName(date)}
            </div>
            <div className={`text-2xl font-bold ${dayIsToday ? 'text-primary' : 'text-foreground'}`}>
              {date.getDate()}
            </div>
            {size !== 'small' && (
              <div className="text-xs text-muted-foreground">
                {formatFullDate(date)}
              </div>
            )}
          </div>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tasks.length} {tasks.length === 1 ? 'lucrare' : 'lucrări'}
            </Badge>
          )}
        </div>

        <div className={`flex-1 space-y-2 overflow-y-auto ${size === 'small' ? 'space-y-1' : ''}`}>
          {visibleTasks.map(task => (
            <TaskItem key={task.id} task={task} compact={size === 'small'} />
          ))}
          {hiddenCount > 0 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{hiddenCount} altele
            </div>
          )}
          {tasks.length === 0 && size !== 'small' && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Nicio lucrare
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar Producție</h1>
            <p className="text-muted-foreground">
              Planificarea lucrărilor pe departamente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrează" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate departamentele</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${departmentColors[dept.id]}`} />
                      {dept.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${departmentColors[dept.id]}`} />
              <span>{dept.name}</span>
            </div>
          ))}
        </div>

        {/* Month Navigation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl capitalize">
                {monthName} {year}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goToToday} className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Astăzi
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Row: Today + Tomorrow + Day after (large) + Next 2 days (medium) */}
            <div className="grid grid-cols-5 gap-4">
              {/* 3 Primary days - larger */}
              {primaryDays.map((date, idx) => (
                <div key={date.toISOString()} className={idx < 3 ? 'col-span-1' : ''}>
                  <DayColumn date={date} size="large" />
                </div>
              ))}
              {/* 2 Secondary days - medium height */}
              {secondaryDays.map((date) => (
                <div key={date.toISOString()} className="col-span-1">
                  <DayColumn date={date} size="medium" />
                </div>
              ))}
            </div>

            {/* Remaining days of month - compact grid */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Restul lunii {monthName}
              </h3>
              <div className="grid grid-cols-7 sm:grid-cols-10 lg:grid-cols-14 gap-2">
                {remainingDays
                  .filter(date => isCurrentMonth(date))
                  .map((date) => (
                    <DayColumn key={date.toISOString()} date={date} size="small" />
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-orange" />
              Lucrări în desfășurare și viitoare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTasks
                .filter(t => t.status !== 'completed')
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 10)
                .map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border cursor-pointer
                      border-l-4 ${departmentBorderColors[task.departmentId]}
                      hover:bg-muted/50 transition-colors
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        <Badge className={productionStatusColors[task.status]}>
                          {productionStatusLabels[task.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${departmentColors[task.departmentId]}`} />
                          {getDepartmentName(task.departmentId)}
                        </span>
                        {task.clientName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.clientName}
                          </span>
                        )}
                        {task.quantity && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {task.quantity} buc
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground text-right">
                      <div>{new Date(task.startDate).toLocaleDateString('ro-RO')}</div>
                      <div>→ {new Date(task.endDate).toLocaleDateString('ro-RO')}</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${departmentColors[selectedTask?.departmentId || '1']}`} />
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedTask.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Departament:</span>
                  <p className="font-medium">{getDepartmentName(selectedTask.departmentId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`ml-2 ${productionStatusColors[selectedTask.status]}`}>
                    {productionStatusLabels[selectedTask.status]}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Perioadă:</span>
                  <p className="font-medium">
                    {new Date(selectedTask.startDate).toLocaleDateString('ro-RO')} - {new Date(selectedTask.endDate).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prioritate:</span>
                  <p className="font-medium">{priorityLabels[selectedTask.priority]}</p>
                </div>
                {selectedTask.clientName && (
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p className="font-medium">{selectedTask.clientName}</p>
                  </div>
                )}
                {selectedTask.quantity && (
                  <div>
                    <span className="text-muted-foreground">Cantitate:</span>
                    <p className="font-medium">{selectedTask.quantity} bucăți</p>
                  </div>
                )}
              </div>

              {selectedTask.notes && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Note:</span>
                  <p className="text-sm mt-1">{selectedTask.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
