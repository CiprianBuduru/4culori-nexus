import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { ProductionTask } from '@/hooks/useProductionTasks';
import { productionStatusLabels, productionStatusColors } from '@/types/production';
import { GripVertical } from 'lucide-react';

interface DraggableTaskProps {
  task: ProductionTask;
  compact?: boolean;
  departmentBorderColor: string;
  onClick: () => void;
}

export function DraggableTask({ task, compact = false, departmentBorderColor, onClick }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : undefined,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        w-full text-left p-2 rounded-lg border-l-4 ${departmentBorderColor}
        bg-muted/50 hover:bg-muted transition-colors group
        ${compact ? 'text-xs' : 'text-sm'}
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}
      `}
    >
      <div className="flex items-start gap-1">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>
        <button onClick={onClick} className="flex-1 text-left min-w-0">
          <div className="font-medium truncate">{task.title}</div>
          {!compact && (
            <div className="flex items-center gap-2 mt-1 text-muted-foreground text-xs">
              <Badge className={`${productionStatusColors[task.status]} text-[10px] px-1.5 py-0`}>
                {productionStatusLabels[task.status]}
              </Badge>
              {task.client_name && <span className="truncate">{task.client_name}</span>}
              {task.operation_name && <span className="truncate text-primary">• {task.operation_name}</span>}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
