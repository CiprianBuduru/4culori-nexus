import { MainLayout } from '@/components/layout/MainLayout';
import { DepartmentCard } from '@/components/departments/DepartmentCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { departments } from '@/data/mockData';
import { Department } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Departments = () => {
  const { toast } = useToast();

  const handleEdit = (department: Department) => {
    toast({
      title: 'Editare departament',
      description: `Deschide formularul de editare pentru ${department.name}`,
    });
  };

  const handleDelete = (department: Department) => {
    toast({
      title: 'Ștergere departament',
      description: `${department.name} a fost șters`,
      variant: 'destructive',
    });
  };

  const totalEmployees = departments.reduce((acc, d) => acc + d.employeeCount, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Departamente</h1>
            <p className="mt-1 text-muted-foreground">
              {departments.length} departamente cu {totalEmployees} angajați
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adaugă Departament
          </Button>
        </div>

        {/* Departments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {departments.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Departments;
