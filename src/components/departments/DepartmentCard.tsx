import { Department } from '@/types';
import { Users, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DepartmentCardProps {
  department: Department;
  onEdit?: (department: Department) => void;
  onDelete?: (department: Department) => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-brand-blue/10',
    text: 'text-brand-blue',
    border: 'border-brand-blue/30',
    icon: 'bg-brand-blue',
  },
  teal: {
    bg: 'bg-brand-teal/10',
    text: 'text-brand-teal',
    border: 'border-brand-teal/30',
    icon: 'bg-brand-teal',
  },
  orange: {
    bg: 'bg-brand-orange/10',
    text: 'text-brand-orange',
    border: 'border-brand-orange/30',
    icon: 'bg-brand-orange',
  },
  green: {
    bg: 'bg-brand-green/10',
    text: 'text-brand-green',
    border: 'border-brand-green/30',
    icon: 'bg-brand-green',
  },
  purple: {
    bg: 'bg-brand-purple/10',
    text: 'text-brand-purple',
    border: 'border-brand-purple/30',
    icon: 'bg-brand-purple',
  },
  pink: {
    bg: 'bg-brand-pink/10',
    text: 'text-brand-pink',
    border: 'border-brand-pink/30',
    icon: 'bg-brand-pink',
  },
};

export function DepartmentCard({ department, onEdit, onDelete }: DepartmentCardProps) {
  const colors = colorClasses[department.color];

  return (
    <div className={cn(
      'group rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-lg',
      colors.bg,
      colors.border
    )}>
      <div className="flex items-start justify-between">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          colors.icon
        )}>
          <Users className="h-6 w-6 text-white" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(department)}>
              Editează
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(department)}
              className="text-destructive"
            >
              Șterge
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4">
        <h3 className={cn('text-xl font-bold', colors.text)}>{department.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{department.description}</p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className={cn('rounded-full px-3 py-1 text-sm font-medium', colors.bg, colors.text)}>
          {department.employeeCount} angajați
        </div>
      </div>

      {department.subDepartments && department.subDepartments.length > 0 && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Servicii:</p>
          <div className="flex flex-wrap gap-1.5">
            {department.subDepartments.map((sub) => (
              <span
                key={sub.id}
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium',
                  colors.bg,
                  colors.text
                )}
              >
                {sub.name} ({sub.employeeCount})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
