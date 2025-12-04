import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DepartmentCard } from '@/components/departments/DepartmentCard';
import { DepartmentEditDialog } from '@/components/departments/DepartmentEditDialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { employees } from '@/data/mockData';
import { Department } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDepartments } from '@/hooks/useDepartments';

const Departments = () => {
  const { departments: departmentList, isLoading, updateDepartment, addDepartment, deleteDepartment } = useDepartments();
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Calculate employee counts dynamically
  const departmentsWithCounts = useMemo(() => {
    return departmentList.map((dept) => {
      const deptEmployees = employees.filter((emp) => emp.departmentId === dept.id);
      const employeeCount = deptEmployees.length;

      // Calculate service counts if subdepartments exist
      const subDepartments = dept.subDepartments?.map((sub) => ({
        ...sub,
        employeeCount: deptEmployees.filter((emp) => emp.serviceIds?.includes(sub.id)).length,
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

  const handleSave = async (data: Omit<Department, 'id' | 'managerId'>) => {
    setIsSaving(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, {
          name: data.name,
          description: data.description,
          color: data.color,
          subDepartments: data.subDepartments,
        });
        toast({
          title: 'Departament actualizat',
          description: `${data.name} a fost actualizat cu succes`,
        });
      } else {
        await addDepartment({
          name: data.name,
          description: data.description,
          color: data.color,
          employeeCount: 0,
          subDepartments: data.subDepartments,
        });
        toast({
          title: 'Departament adăugat',
          description: `${data.name} a fost adăugat cu succes`,
        });
      }
      setIsDialogOpen(false);
      setEditingDepartment(null);
    } catch (error) {
      // Error already handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (department: Department) => {
    try {
      await deleteDepartment(department.id);
      toast({
        title: 'Departament șters',
        description: `${department.name} a fost șters`,
        variant: 'destructive',
      });
    } catch (error) {
      // Error already handled in hook
    }
  };

  const totalEmployees = employees.length;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

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
        isLoading={isSaving}
      />
    </MainLayout>
  );
};

export default Departments;
