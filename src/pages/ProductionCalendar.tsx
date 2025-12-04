import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
  Package,
  Trash2,
  UserCheck,
  AlertTriangle,
  ShoppingCart,
  FileText
} from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { useProductionTasks, ProductionTask } from '@/hooks/useProductionTasks';
import { useEmployees } from '@/hooks/useEmployees';
import { sendTaskNotification, sendOrderStatusNotification } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  productionStatusLabels, 
  productionStatusColors,
  priorityLabels 
} from '@/types/production';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { DroppableDay } from '@/components/calendar/DroppableDay';
import { DraggableTask } from '@/components/calendar/DraggableTask';
import { format, differenceInDays, addDays } from 'date-fns';
import { ro } from 'date-fns/locale';

const departmentColors: Record<string, string> = {
  '1': 'bg-brand-blue',    // Vânzări
  '2': 'bg-brand-teal',    // Producție
  '3': 'bg-brand-pink',    // Marketing
  '4': 'bg-brand-purple',  // Financiar
  '5': 'bg-brand-green',   // Management
  '6': 'bg-brand-orange',  // DTP
};

const departmentBorderColors: Record<string, string> = {
  '1': 'border-l-brand-blue',
  '2': 'border-l-brand-teal',
  '3': 'border-l-brand-pink',
  '4': 'border-l-brand-purple',
  '5': 'border-l-brand-green',
  '6': 'border-l-brand-orange',
};

export default function ProductionCalendar() {
  const { departments } = useDepartments();
  const { tasks: productionTasks, isLoading, deleteTask, updateTask } = useProductionTasks();
  const { employees } = useEmployees();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingOrderStatus, setEditingOrderStatus] = useState(false);
  const [activeTask, setActiveTask] = useState<ProductionTask | null>(null);

  const queryClient = useQueryClient();

  // Fetch all orders (comanda only) for calendar display
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-calendar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, due_date, production_days, status, client_id, name, brief, notes, total_amount, production_operations, document_type, clients(name)')
        .eq('document_type', 'comanda')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Filter orders for alerts (only those needing production start)
  const ordersForAlerts = useMemo(() => {
    return allOrders.filter(order => 
      order.production_days && order.production_days > 0 && 
      ['bt_approved', 'production'].includes(order.status)
    );
  }, [allOrders]);

  // Calculate production alerts - orders that need to start production
  const productionAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return ordersForAlerts.map(order => {
      const dueDate = new Date(order.due_date!);
      const productionStartDate = addDays(dueDate, -order.production_days!);
      const daysUntilStart = differenceInDays(productionStartDate, today);
      
      return {
        ...order,
        productionStartDate,
        daysUntilStart,
        isUrgent: daysUntilStart <= 0,
        isWarning: daysUntilStart > 0 && daysUntilStart <= 3,
      };
    }).filter(alert => alert.daysUntilStart <= 7); // Show alerts for next 7 days
  }, [ordersForAlerts]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get employee name by ID
  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return null;
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || null;
  };

  const getEmployee = (employeeId: string | null) => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId) || null;
  };

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

    // Remaining days: starting from day 6 onwards (after primary + secondary)
    const remaining: Date[] = [];
    const startDate = new Date(todayDate);
    startDate.setDate(todayDate.getDate() + 5); // Day 6 onwards
    
    // Continue until end of month
    const endOfMonth = new Date(year, month + 1, 0);
    const currentDay = new Date(startDate);
    
    while (currentDay <= endOfMonth) {
      remaining.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return {
      primaryDays: primary,
      secondaryDays: secondary,
      remainingDays: remaining,
      monthName: firstDay.toLocaleDateString('ro-RO', { month: 'long' }),
      year,
    };
  }, [currentDate]);

  // Production calendar only shows DTP (6) and Producție (2) departments
  const allowedDepartmentIds = ['2', '6'];
  
  // Filter departments for dropdown
  const productionDepartments = useMemo(() => {
    return departments.filter(d => allowedDepartmentIds.includes(d.id));
  }, [departments]);

  // Filter tasks - only DTP and Producție
  const filteredTasks = useMemo(() => {
    const baseTasks = productionTasks.filter(task => 
      allowedDepartmentIds.includes(task.department_id)
    );
    
    if (selectedDepartment === 'all') {
      return baseTasks;
    }
    return baseTasks.filter(task => task.department_id === selectedDepartment);
  }, [selectedDepartment, productionTasks]);

  // Get tasks for a specific date
  const getTasksForDate = (date: Date): ProductionTask[] => {
    const dateStr = date.toISOString().split('T')[0];
    
    return filteredTasks.filter(task => {
      const start = new Date(task.start_date);
      const end = new Date(task.end_date);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  // Helper to get local date string (timezone-aware)
  const getLocalDateString = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  // Get orders for a specific date (by due_date) + overdue orders (only on today)
  const getOrdersForDate = (date: Date) => {
    const dateStr = getLocalDateString(date);
    const todayStr = getLocalDateString(new Date());
    
    // Orders due on this date
    const ordersForDate = allOrders.filter(order => order.due_date === dateStr);
    
    // Overdue orders only appear on TODAY (not on future calendar days)
    // They carry over day by day until completed
    const overdueOrders = dateStr === todayStr 
      ? allOrders.filter(order => 
          order.due_date && 
          order.due_date < todayStr && 
          order.status !== 'completed' && 
          order.status !== 'cancelled'
        ).map(order => ({ ...order, isOverdue: true }))
      : [];
    
    // Mark regular orders (not overdue since they're on their due date)
    const regularOrders = ordersForDate.map(order => ({ 
      ...order, 
      isOverdue: false
    }));
    
    // Return overdue orders first, then regular orders
    return [...overdueOrders, ...regularOrders];
  };

  // Order status labels and colors
  const orderStatusLabels: Record<string, string> = {
    pending: 'În așteptare',
    in_progress: 'În lucru',
    completed: 'Finalizată',
    cancelled: 'Anulată',
    dtp: 'DTP',
    bt_waiting: 'Așteaptă BT',
    bt_approved: 'BT Aprobat',
    production: 'În Producție',
  };

  const orderStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    dtp: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    bt_waiting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    bt_approved: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    production: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  };

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status, previousStatus, orderNumber, orderName, clientName }: { 
      id: string; 
      status: string; 
      previousStatus: string;
      orderNumber: string;
      orderName?: string;
      clientName?: string;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      
      // Send notification
      await sendOrderStatusNotification({
        orderId: id,
        orderNumber,
        orderName,
        clientName,
        previousStatus,
        newStatus: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-calendar'] });
      toast({ title: 'Status actualizat', description: 'Progresul comenzii a fost salvat și notificarea a fost trimisă.' });
    },
    onError: () => {
      toast({ title: 'Eroare', description: 'Nu s-a putut actualiza statusul.', variant: 'destructive' });
    },
  });

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

  const getDepartmentColor = (deptId: string) => {
    return departmentColors[deptId] || 'bg-muted';
  };

  const getDepartmentBorderColor = (deptId: string) => {
    return departmentBorderColors[deptId] || 'border-l-muted';
  };

  const handleDeleteTask = async () => {
    if (selectedTask) {
      await deleteTask.mutateAsync(selectedTask.id);
      setSelectedTask(null);
    }
  };

  const handleAssigneeChange = async (employeeId: string) => {
    if (selectedTask) {
      const previousAssignee = selectedTask.assigned_to;
      
      await updateTask.mutateAsync({
        id: selectedTask.id,
        assigned_to: employeeId || null,
      });
      setSelectedTask({ ...selectedTask, assigned_to: employeeId || null });
      setEditingAssignee(false);

      // Send notification if assigning to a new employee
      if (employeeId && employeeId !== previousAssignee) {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          toast({
            title: "Task asignat",
            description: `${employee.name} a fost notificat despre task-ul "${selectedTask.title}"`,
          });

          await sendTaskNotification({
            employeeId: employee.id,
            employeeName: employee.name,
            employeeEmail: employee.email,
            taskTitle: selectedTask.title,
            taskId: selectedTask.id,
            startDate: selectedTask.start_date,
            endDate: selectedTask.end_date,
            clientName: selectedTask.client_name || undefined,
            operationName: selectedTask.operation_name || undefined,
          });
        }
      }
    }
  };

  // Get employees for the selected task's department
  const getTaskDepartmentEmployees = () => {
    if (!selectedTask) return employees;
    return employees.filter(e => e.departmentId === selectedTask.department_id);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = productionTasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetDateStr = (over.data.current as { date: string })?.date;
    
    if (!targetDateStr) return;

    const task = productionTasks.find(t => t.id === taskId);
    if (!task) return;

    // Calculate the duration of the task
    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);
    const durationMs = endDate.getTime() - startDate.getTime();

    // New start date from where we dropped
    const newStartDate = new Date(targetDateStr);
    const newEndDate = new Date(newStartDate.getTime() + durationMs);

    // Format dates for database
    const newStartStr = newStartDate.toISOString().split('T')[0];
    const newEndStr = newEndDate.toISOString().split('T')[0];

    // Only update if dates actually changed
    if (newStartStr !== task.start_date) {
      await updateTask.mutateAsync({
        id: taskId,
        start_date: newStartStr,
        end_date: newEndStr,
      });

      toast({
        title: "Task mutat",
        description: `"${task.title}" a fost mutat pe ${newStartDate.toLocaleDateString('ro-RO')}`,
      });
    }
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
                <SelectItem value="all">DTP & Producție</SelectItem>
                {productionDepartments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getDepartmentColor(dept.id)}`} />
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
          {productionDepartments.map(dept => (
            <div key={dept.id} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${getDepartmentColor(dept.id)}`} />
              <span>{dept.name}</span>
            </div>
          ))}
        </div>

        {/* Production Alerts */}
        {productionAlerts.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-5 w-5" />
                Alerte Început Producție ({productionAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {productionAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.isUrgent 
                        ? 'bg-red-100 border-red-300 dark:bg-red-950/50 dark:border-red-800' 
                        : alert.isWarning 
                          ? 'bg-orange-100 border-orange-300 dark:bg-orange-950/50 dark:border-orange-800'
                          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-semibold text-sm truncate">
                          #{alert.order_number}
                        </p>
                        {alert.clients && (
                          <p className="text-xs text-muted-foreground truncate">
                            {(alert.clients as any).name}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={alert.isUrgent ? 'destructive' : alert.isWarning ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {alert.isUrgent 
                          ? 'Începe AZI!' 
                          : alert.daysUntilStart === 1 
                            ? 'Mâine' 
                            : `${alert.daysUntilStart} zile`}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Start producție:</span>{' '}
                        {format(alert.productionStartDate, 'd MMM', { locale: ro })}
                      </p>
                      <p>
                        <span className="font-medium">Livrare:</span>{' '}
                        {format(new Date(alert.due_date!), 'd MMM', { locale: ro })}
                      </p>
                      <p>
                        <span className="font-medium">Durată:</span>{' '}
                        {alert.production_days} zile
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Primary Row: Today + Tomorrow + Day after (large) + Next 2 days (medium) */}
              <div className="grid grid-cols-5 gap-4">
                {/* 3 Primary days - larger */}
                {primaryDays.map((date, idx) => (
                  <div key={date.toISOString()} className={idx < 3 ? 'col-span-1' : ''}>
                    <DroppableDay
                      date={date}
                      tasks={getTasksForDate(date)}
                      orders={getOrdersForDate(date)}
                      size="large"
                      isToday={isToday(date)}
                      isCurrentMonth={isCurrentMonth(date)}
                      getDepartmentBorderColor={getDepartmentBorderColor}
                      onTaskClick={setSelectedTask}
                      onOrderClick={setSelectedOrder}
                      orderStatusLabels={orderStatusLabels}
                      orderStatusColors={orderStatusColors}
                    />
                  </div>
                ))}
                {/* 2 Secondary days - medium height */}
                {secondaryDays.map((date) => (
                  <div key={date.toISOString()} className="col-span-1">
                    <DroppableDay
                      date={date}
                      tasks={getTasksForDate(date)}
                      orders={getOrdersForDate(date)}
                      size="medium"
                      isToday={isToday(date)}
                      isCurrentMonth={isCurrentMonth(date)}
                      getDepartmentBorderColor={getDepartmentBorderColor}
                      onTaskClick={setSelectedTask}
                      onOrderClick={setSelectedOrder}
                      orderStatusLabels={orderStatusLabels}
                      orderStatusColors={orderStatusColors}
                    />
                  </div>
                ))}
              </div>

              {/* Remaining days of month - compact grid */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Restul lunii {monthName}
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {remainingDays
                    .filter(date => isCurrentMonth(date))
                    .map((date) => (
                      <DroppableDay
                        key={date.toISOString()}
                        date={date}
                        tasks={getTasksForDate(date)}
                        orders={getOrdersForDate(date)}
                        size="small"
                        isToday={isToday(date)}
                        isCurrentMonth={isCurrentMonth(date)}
                        getDepartmentBorderColor={getDepartmentBorderColor}
                        onTaskClick={setSelectedTask}
                        onOrderClick={setSelectedOrder}
                        orderStatusLabels={orderStatusLabels}
                        orderStatusColors={orderStatusColors}
                      />
                    ))}
                </div>
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeTask && (
                  <div className={`
                    p-2 rounded-lg border-l-4 ${getDepartmentBorderColor(activeTask.department_id)}
                    bg-card shadow-xl text-sm opacity-90
                  `}>
                    <div className="font-medium">{activeTask.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground text-xs">
                      <Badge className={`${productionStatusColors[activeTask.status]} text-[10px] px-1.5 py-0`}>
                        {productionStatusLabels[activeTask.status]}
                      </Badge>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
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
                .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, 10)
                .map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border cursor-pointer
                      border-l-4 ${getDepartmentBorderColor(task.department_id)}
                      hover:bg-muted/50 transition-colors
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        <Badge className={productionStatusColors[task.status]}>
                          {productionStatusLabels[task.status]}
                        </Badge>
                        {task.operation_name && (
                          <Badge variant="outline" className="text-xs">
                            {task.operation_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${getDepartmentColor(task.department_id)}`} />
                          {getDepartmentName(task.department_id)}
                        </span>
                        {task.client_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.client_name}
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
                    <div className="flex items-center gap-3">
                      {task.assigned_to && (
                        <Avatar className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={getEmployee(task.assigned_to)?.avatar} />
                          <AvatarFallback className="text-xs">
                            {getEmployeeName(task.assigned_to)?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="text-sm text-muted-foreground text-right">
                        <div>{new Date(task.start_date).toLocaleDateString('ro-RO')}</div>
                        <div>→ {new Date(task.end_date).toLocaleDateString('ro-RO')}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => { setSelectedTask(null); setEditingAssignee(false); setEditingStatus(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${getDepartmentColor(selectedTask?.department_id || '')}`} />
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              {selectedTask.description && (
                <p className="text-muted-foreground">{selectedTask.description}</p>
              )}
              
              {/* Assigned Employee Section */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    Responsabil
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingAssignee(!editingAssignee)}
                  >
                    {editingAssignee ? 'Anulează' : 'Modifică'}
                  </Button>
                </div>
                
                {editingAssignee ? (
                  <Select 
                    value={selectedTask.assigned_to || 'unassigned'} 
                    onValueChange={(val) => handleAssigneeChange(val === 'unassigned' ? '' : val)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selectează angajat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Neasignat</SelectItem>
                      {getTaskDepartmentEmployees().map((emp) => (
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
                ) : (
                  <div className="mt-2">
                    {selectedTask.assigned_to ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={getEmployee(selectedTask.assigned_to)?.avatar} />
                          <AvatarFallback>
                            {getEmployeeName(selectedTask.assigned_to)?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getEmployeeName(selectedTask.assigned_to)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Neasignat</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Status Edit Section */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Status
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingStatus(!editingStatus)}
                  >
                    {editingStatus ? 'Anulează' : 'Modifică'}
                  </Button>
                </div>
                
                {editingStatus ? (
                  <Select 
                    value={selectedTask.status} 
                    onValueChange={async (value: 'pending' | 'in-progress' | 'completed' | 'delayed') => {
                      await updateTask.mutateAsync({
                        id: selectedTask.id,
                        status: value,
                      });
                      setSelectedTask({ ...selectedTask, status: value });
                      setEditingStatus(false);
                      toast({
                        title: "Status actualizat",
                        description: `Task-ul "${selectedTask.title}" a fost marcat ca ${productionStatusLabels[value]}`,
                      });
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          În așteptare
                        </span>
                      </SelectItem>
                      <SelectItem value="in-progress">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          În lucru
                        </span>
                      </SelectItem>
                      <SelectItem value="completed">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Finalizat
                        </span>
                      </SelectItem>
                      <SelectItem value="delayed">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Întârziat
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-2">
                    <Badge className={productionStatusColors[selectedTask.status]}>
                      {productionStatusLabels[selectedTask.status]}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Departament:</span>
                  <p className="font-medium">{getDepartmentName(selectedTask.department_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Perioadă:</span>
                  <p className="font-medium">
                    {new Date(selectedTask.start_date).toLocaleDateString('ro-RO')} - {new Date(selectedTask.end_date).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prioritate:</span>
                  <p className="font-medium">{priorityLabels[selectedTask.priority]}</p>
                </div>
                {selectedTask.client_name && (
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <p className="font-medium">{selectedTask.client_name}</p>
                  </div>
                )}
                {selectedTask.quantity && (
                  <div>
                    <span className="text-muted-foreground">Cantitate:</span>
                    <p className="font-medium">{selectedTask.quantity} bucăți</p>
                  </div>
                )}
                {selectedTask.operation_name && (
                  <div>
                    <span className="text-muted-foreground">Operațiune:</span>
                    <p className="font-medium">{selectedTask.operation_name}</p>
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
          <DialogFooter>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteTask}
              disabled={deleteTask.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Șterge Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order/Offer Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOrder?.document_type === 'oferta' ? (
                <>
                  <FileText className="h-5 w-5 text-blue-600" />
                  Ofertă {selectedOrder?.order_number}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  Comandă {selectedOrder?.order_number}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Document type badge */}
              {selectedOrder.document_type === 'oferta' && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ofertă</Badge>
              )}
              
              {/* Order name */}
              {selectedOrder.name && (
                <div>
                  <span className="text-sm text-muted-foreground">Denumire:</span>
                  <p className="font-medium">{selectedOrder.name}</p>
                </div>
              )}

              {/* Client */}
              {selectedOrder.clients?.name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedOrder.clients.name}</span>
                </div>
              )}

              {/* Status - Editable */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Status {selectedOrder.document_type === 'oferta' ? 'Ofertă' : 'Comandă'}
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingOrderStatus(!editingOrderStatus)}
                  >
                    {editingOrderStatus ? 'Anulează' : 'Modifică'}
                  </Button>
                </div>
                
                {editingOrderStatus ? (
                  <Select 
                    value={selectedOrder.status} 
                    onValueChange={async (value) => {
                      await updateOrderStatus.mutateAsync({ 
                        id: selectedOrder.id, 
                        status: value,
                        previousStatus: selectedOrder.status,
                        orderNumber: selectedOrder.order_number,
                        orderName: selectedOrder.name,
                        clientName: selectedOrder.clients?.name,
                      });
                      setSelectedOrder({ ...selectedOrder, status: value });
                      setEditingOrderStatus(false);
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(orderStatusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${orderStatusColors[key]?.split(' ')[0] || 'bg-gray-300'}`} />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-2">
                    <Badge className={`${orderStatusColors[selectedOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                      {orderStatusLabels[selectedOrder.status] || selectedOrder.status}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Due date and production days */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Livrare</span>
                    <span className="font-medium">
                      {selectedOrder.due_date ? format(new Date(selectedOrder.due_date), 'd MMMM yyyy', { locale: ro }) : '-'}
                    </span>
                  </div>
                </div>
                {selectedOrder.production_days > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Producție</span>
                      <span className="font-medium">{selectedOrder.production_days} zile</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total amount */}
              {selectedOrder.total_amount > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Valoare totală:</span>
                  <p className="font-semibold text-lg">{selectedOrder.total_amount.toLocaleString('ro-RO')} RON</p>
                </div>
              )}

              {/* Production operations */}
              {selectedOrder.production_operations?.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Operațiuni producție:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedOrder.production_operations.map((op: string, idx: number) => (
                      <Badge key={idx} variant="outline">{op}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Brief */}
              {selectedOrder.brief && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Brief:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedOrder.brief}</p>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Note:</span>
                  <p className="text-sm mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedOrder(null)}
            >
              Închide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
