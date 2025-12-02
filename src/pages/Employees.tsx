import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { employees, departments } from '@/data/mockData';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (employee: Employee) => {
    toast({
      title: 'Editare angajat',
      description: `Deschide formularul de editare pentru ${employee.name}`,
    });
  };

  const handleDelete = (employee: Employee) => {
    toast({
      title: 'Ștergere angajat',
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
              Gestionează echipa ta de {employees.length} angajați
            </p>
          </div>
          <Button className="gap-2">
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
    </MainLayout>
  );
};

export default Employees;
