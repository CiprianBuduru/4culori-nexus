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
  '1': 'bg-brand-blue', // Vânzări
  '2': 'bg-brand-teal', // Producție
  '3': 'bg-brand-orange', // Marketing
  '4': 'bg-brand-green', // Financiar
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

  // Get current month's days
  const { daysInMonth, firstDayOfMonth, monthName, year } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      daysInMonth: lastDay.getDate(),
      firstDayOfMonth: firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1, // Monday = 0
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

  // Get tasks for a specific day
  const getTasksForDay = (day: number): ProductionTask[] => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    
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

  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const weekDays = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const getDepartmentName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || 'Necunoscut';
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

        {/* Calendar */}
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
          <CardContent>
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div 
                  key={day} 
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayTasks = day ? getTasksForDay(day) : [];
                
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] p-1 border rounded-lg
                      ${day ? 'bg-card' : 'bg-muted/30'}
                      ${isToday(day || 0) ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    {day && (
                      <>
                        <div className={`
                          text-sm font-medium mb-1 px-1
                          ${isToday(day) ? 'text-primary' : 'text-foreground'}
                        `}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map(task => (
                            <button
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`
                                w-full text-left text-xs p-1 rounded truncate
                                border-l-2 ${departmentBorderColors[task.departmentId]}
                                bg-muted/50 hover:bg-muted transition-colors
                              `}
                            >
                              {task.title}
                            </button>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{dayTasks.length - 3} altele
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
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
