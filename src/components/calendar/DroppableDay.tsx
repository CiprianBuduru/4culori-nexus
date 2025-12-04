import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ProductionTask } from '@/hooks/useProductionTasks';
import { DraggableTask } from './DraggableTask';
import { ShoppingCart } from 'lucide-react';

interface OrderForCalendar {
  id: string;
  order_number: string;
  due_date: string | null;
  status: string;
  name: string | null;
  clients: { name: string } | null;
}

interface DroppableDayProps {
  date: Date;
  tasks: ProductionTask[];
  orders?: OrderForCalendar[];
  size?: 'large' | 'medium' | 'small';
  isToday: boolean;
  isCurrentMonth: boolean;
  getDepartmentBorderColor: (deptId: string) => string;
  onTaskClick: (task: ProductionTask) => void;
  orderStatusLabels?: Record<string, string>;
  orderStatusColors?: Record<string, string>;
}

export function DroppableDay({
  date,
  tasks,
  orders = [],
  size = 'large',
  isToday: dayIsToday,
  isCurrentMonth: inCurrentMonth,
  getDepartmentBorderColor,
  onTaskClick,
  orderStatusLabels = {},
  orderStatusColors = {},
}: DroppableDayProps) {
  const dateStr = date.toISOString().split('T')[0];
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { date: dateStr },
  });

  const formatDayName = (d: Date) => {
    return d.toLocaleDateString('ro-RO', { weekday: 'short' });
  };

  const formatFullDate = (d: Date) => {
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
  };

  const totalItems = tasks.length + orders.length;
  const maxTasks = size === 'large' ? Infinity : size === 'medium' ? 5 : 2;
  const visibleTasks = tasks.slice(0, maxTasks);
  const remainingSlots = Math.max(0, maxTasks - visibleTasks.length);
  const visibleOrders = orders.slice(0, remainingSlots);
  const hiddenCount = totalItems - visibleTasks.length - visibleOrders.length;

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border bg-card p-3 flex flex-col transition-colors
        ${dayIsToday ? 'ring-2 ring-primary shadow-lg' : ''}
        ${!inCurrentMonth ? 'opacity-50' : ''}
        ${size === 'large' ? 'min-h-[400px]' : size === 'medium' ? 'min-h-[200px]' : 'min-h-[80px]'}
        ${isOver ? 'bg-primary/10 border-primary' : ''}
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
        <div className="flex flex-col items-end gap-1">
          {tasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {tasks.length} {tasks.length === 1 ? 'lucrare' : 'lucrări'}
            </Badge>
          )}
          {orders.length > 0 && (
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800">
              {orders.length} {orders.length === 1 ? 'comandă' : 'comenzi'}
            </Badge>
          )}
        </div>
      </div>

      <div className={`flex-1 space-y-2 overflow-y-auto ${size === 'small' ? 'space-y-1' : ''}`}>
        {/* Orders first - they represent deadlines */}
        {visibleOrders.map(order => (
          <div
            key={order.id}
            className={`
              w-full p-2 rounded-lg border-l-4 border-l-emerald-500
              bg-emerald-50/50 dark:bg-emerald-950/20 
              ${size === 'small' ? 'text-xs' : 'text-sm'}
            `}
          >
            <div className="flex items-start gap-2">
              <ShoppingCart className="h-3 w-3 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono font-semibold truncate text-emerald-800 dark:text-emerald-200">
                  {order.order_number}
                </div>
                {!size || size !== 'small' && (
                  <>
                    {order.name && (
                      <div className="text-xs text-muted-foreground truncate">{order.name}</div>
                    )}
                    {order.clients?.name && (
                      <div className="text-xs text-muted-foreground truncate">{order.clients.name}</div>
                    )}
                    <Badge className={`${orderStatusColors[order.status] || 'bg-gray-100 text-gray-800'} text-[10px] px-1.5 py-0 mt-1`}>
                      {orderStatusLabels[order.status] || order.status}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Tasks */}
        {visibleTasks.map(task => (
          <DraggableTask
            key={task.id}
            task={task}
            compact={size === 'small'}
            departmentBorderColor={getDepartmentBorderColor(task.department_id)}
            onClick={() => onTaskClick(task)}
          />
        ))}
        
        {hiddenCount > 0 && (
          <div className="text-xs text-muted-foreground text-center py-1">
            +{hiddenCount} altele
          </div>
        )}
        {totalItems === 0 && size !== 'small' && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Nicio lucrare
          </div>
        )}
      </div>
    </div>
  );
}
