import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Map from database row to Employee type
const mapRowToEmployee = (row: any): Employee => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || '',
  position: row.position,
  departmentId: row.department_id,
  serviceIds: row.service_ids || [],
  hireDate: row.hire_date || '',
  birthDate: row.birth_date || undefined,
  vacationDays: row.vacation_days_per_year,
  status: row.status as 'active' | 'inactive',
  avatar: row.avatar || undefined,
  company: row.company as 'LMG' | 'EQS' | undefined,
  isProtectedUnit: row.is_protected_unit || false,
  salariuBrut: row.salary_gross || undefined,
  salariuNet: row.salary_net || undefined,
  accessLevel: row.access_level || 0,
});

// Map from Employee type to database insert/update
const mapEmployeeToRow = (employee: Omit<Employee, 'id'> & { id?: string }) => ({
  ...(employee.id && { id: employee.id }),
  name: employee.name,
  email: employee.email,
  phone: employee.phone || null,
  position: employee.position,
  department_id: employee.departmentId,
  service_ids: employee.serviceIds || [],
  hire_date: employee.hireDate || null,
  birth_date: employee.birthDate || null,
  vacation_days_per_year: employee.vacationDays || 21,
  status: employee.status,
  avatar: employee.avatar || null,
  company: employee.company || null,
  is_protected_unit: employee.isProtectedUnit || false,
  salary_gross: employee.salariuBrut || null,
  salary_net: employee.salariuNet || null,
  access_level: employee.accessLevel || 0,
});

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca angajații',
        variant: 'destructive',
      });
    } else {
      setEmployees((data || []).map(mapRowToEmployee));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    const row = mapEmployeeToRow(employee);
    const { data, error } = await supabase
      .from('employees')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error adding employee:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut adăuga angajatul',
        variant: 'destructive',
      });
      return null;
    }

    const newEmployee = mapRowToEmployee(data);
    setEmployees((prev) => [...prev, newEmployee]);
    toast({
      title: 'Angajat adăugat',
      description: `${employee.name} a fost adăugat cu succes`,
    });
    return newEmployee;
  };

  const updateEmployee = async (id: string, employee: Omit<Employee, 'id'>) => {
    const row = mapEmployeeToRow(employee);
    const { data, error } = await supabase
      .from('employees')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza angajatul',
        variant: 'destructive',
      });
      return null;
    }

    const updatedEmployee = mapRowToEmployee(data);
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? updatedEmployee : emp))
    );
    toast({
      title: 'Angajat actualizat',
      description: `${employee.name} a fost actualizat cu succes`,
    });
    return updatedEmployee;
  };

  const deleteEmployee = async (id: string, name: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge angajatul',
        variant: 'destructive',
      });
      return false;
    }

    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    toast({
      title: 'Angajat șters',
      description: `${name} a fost șters`,
      variant: 'destructive',
    });
    return true;
  };

  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees,
  };
};
