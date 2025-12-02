import { Employee, Department } from '@/types';
import { Mail, Phone, Calendar, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface EmployeeCardProps {
  employee: Employee;
  department?: Department;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export function EmployeeCard({ employee, department, onEdit, onDelete }: EmployeeCardProps) {
  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{employee.name}</h3>
            <p className="text-sm text-muted-foreground">{employee.position}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(employee)}>
              Editează
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete?.(employee)}
              className="text-destructive"
            >
              Șterge
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{employee.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{employee.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Angajat din {new Date(employee.hireDate).toLocaleDateString('ro-RO')}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {department && (
          <Badge variant="secondary" className="font-medium">
            {department.name}
          </Badge>
        )}
        <Badge 
          variant={employee.status === 'active' ? 'default' : 'outline'}
          className={employee.status === 'active' ? 'bg-success text-success-foreground' : ''}
        >
          {employee.status === 'active' ? 'Activ' : 'Inactiv'}
        </Badge>
      </div>
    </div>
  );
}
