import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ProductionTask } from '@/hooks/useProductionTasks';
import { DraggableTask } from './DraggableTask';

interface DroppableDayProps {
  date: Date;
  tasks: ProductionTask[];
  size?: 'large' | 'medium' | 'small';
  isToday: boolean;
  isCurrentMonth: boolean;
  getDepartmentBorderColor: (deptId: string) => string;
  onTaskClick: (task: ProductionTask) => void;
}

export function DroppableDay({
  date,
  tasks,
  size = 'large',
  isToday: dayIsToday,
  isCurrentMonth: inCurrentMonth,
  getDepartmentBorderColor,
  onTaskClick,
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

  const maxTasks = size === 'large' ? Infinity : size === 'medium' ? 5 : 2;
  const visibleTasks = tasks.slice(0, maxTasks);
  const hiddenCount = tasks.length - visibleTasks.length;

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
        {tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {tasks.length} {tasks.length === 1 ? 'lucrare' : 'lucrări'}
          </Badge>
        )}
      </div>

      <div className={`flex-1 space-y-2 overflow-y-auto ${size === 'small' ? 'space-y-1' : ''}`}>
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
        {tasks.length === 0 && size !== 'small' && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Nicio lucrare
          </div>
        )}
      </div>
    </div>
  );
}
