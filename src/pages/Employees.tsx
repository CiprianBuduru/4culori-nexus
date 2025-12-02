import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { EmployeeEditDialog } from '@/components/employees/EmployeeEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { employees as initialEmployees, departments } from '@/data/mockData';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeList, setEmployeeList] = useState<Employee[]>(initialEmployees);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredEmployees = employeeList.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  const handleSave = (data: Omit<Employee, 'id' | 'avatar'>) => {
    if (editingEmployee) {
      // Update existing employee
      setEmployeeList((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id ? { ...emp, ...data } : emp
        )
      );
      toast({
        title: 'Angajat actualizat',
        description: `${data.name} a fost actualizat cu succes`,
      });
    } else {
      // Add new employee
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        ...data,
      };
      setEmployeeList((prev) => [...prev, newEmployee]);
      toast({
        title: 'Angajat adăugat',
        description: `${data.name} a fost adăugat cu succes`,
      });
    }
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = (employee: Employee) => {
    setEmployeeList((prev) => prev.filter((emp) => emp.id !== employee.id));
    toast({
      title: 'Angajat șters',
      description: `${employee.name} a fost șters`,
      variant: 'destructive',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Angajați</h1>
            <p className="mt-1 text-muted-foreground">
              Gestionează echipa ta de {employeeList.length} angajați
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            Adaugă Angajat
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Caută angajați..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employees Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              department={departments.find((d) => d.id === employee.departmentId)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Nu am găsit angajați
            </p>
            <p className="text-sm text-muted-foreground">
              Încearcă să modifici criteriile de căutare
            </p>
          </div>
        )}
      </div>

      <EmployeeEditDialog
        employee={editingEmployee}
        departments={departments}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
    </MainLayout>
  );
};

export default Employees;
