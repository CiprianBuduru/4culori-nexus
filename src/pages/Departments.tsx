import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DepartmentCard } from '@/components/departments/DepartmentCard';
import { DepartmentEditDialog } from '@/components/departments/DepartmentEditDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { departments as initialDepartments, employees } from '@/data/mockData';
import { Department } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Departments = () => {
  const [departmentList, setDepartmentList] = useState<Department[]>(initialDepartments);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Calculate employee counts dynamically
  const departmentsWithCounts = useMemo(() => {
    return departmentList.map((dept) => {
      const deptEmployees = employees.filter((emp) => emp.departmentId === dept.id);
      const employeeCount = deptEmployees.length;

      // Calculate service counts if subdepartments exist
      const subDepartments = dept.subDepartments?.map((sub) => ({
        ...sub,
        employeeCount: deptEmployees.filter((emp) => emp.serviceId === sub.id).length,
      }));

      return {
        ...dept,
        employeeCount,
        subDepartments,
      };
    });
  }, [departmentList]);

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingDepartment(null);
    setIsDialogOpen(true);
  };

  const handleSave = (data: Omit<Department, 'id' | 'managerId'>) => {
    if (editingDepartment) {
      setDepartmentList((prev) =>
        prev.map((dept) =>
          dept.id === editingDepartment.id 
            ? { ...dept, ...data, subDepartments: data.subDepartments } 
            : dept
        )
      );
      toast({
        title: 'Departament actualizat',
        description: `${data.name} a fost actualizat cu succes`,
      });
    } else {
      const newDepartment: Department = {
        id: crypto.randomUUID(),
        ...data,
      };
      setDepartmentList((prev) => [...prev, newDepartment]);
      toast({
        title: 'Departament adăugat',
        description: `${data.name} a fost adăugat cu succes`,
      });
    }
    setIsDialogOpen(false);
    setEditingDepartment(null);
  };

  const handleDelete = (department: Department) => {
    setDepartmentList((prev) => prev.filter((dept) => dept.id !== department.id));
    toast({
      title: 'Departament șters',
      description: `${department.name} a fost șters`,
      variant: 'destructive',
    });
  };

  const totalEmployees = employees.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Departamente</h1>
            <p className="mt-1 text-muted-foreground">
              {departmentList.length} departamente cu {totalEmployees} angajați
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            Adaugă Departament
          </Button>
        </div>

        {/* Departments Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {departmentsWithCounts.map((department) => (
            <DepartmentCard
              key={department.id}
              department={department}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      <DepartmentEditDialog
        department={editingDepartment}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
    </MainLayout>
  );
};

export default Departments;
