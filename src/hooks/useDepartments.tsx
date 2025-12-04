import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Department, SubDepartment } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DepartmentsContextType {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  productionOperations: { id: string; name: string }[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  updateDepartment: (id: string, data: Partial<Department>) => Promise<void>;
  addDepartment: (data: Omit<Department, 'id'>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextType | undefined>(undefined);

interface DbDepartment {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sub_departments: { id: string; name: string }[] | null;
  created_at: string;
  updated_at: string;
}

export function DepartmentsProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      const mapped: Department[] = (data as DbDepartment[]).map(d => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        color: d.color as Department['color'],
        employeeCount: 0,
        subDepartments: d.sub_departments?.map(s => ({
          id: s.id,
          name: s.name,
          employeeCount: 0,
        })) || [],
      }));

      // Order departments in preferred order
      const orderMap: Record<string, number> = {
        'Management': 0,
        'Vânzări': 1,
        'DTP': 2,
        'Producție': 3,
        'Marketing': 4,
        'Financiar': 5,
      };

      mapped.sort((a, b) => {
        const orderA = orderMap[a.name] ?? 999;
        const orderB = orderMap[b.name] ?? 999;
        return orderA - orderB;
      });

      setDepartments(mapped);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-au putut încărca departamentele',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const updateDepartment = useCallback(async (id: string, data: Partial<Department>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.subDepartments !== undefined) {
        updateData.sub_departments = data.subDepartments.map(s => ({
          id: s.id,
          name: s.name,
        }));
      }

      const { error } = await supabase
        .from('departments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setDepartments(prev => prev.map(d => 
        d.id === id ? { ...d, ...data } : d
      ));

      toast({
        title: 'Succes',
        description: 'Departamentul a fost actualizat',
      });
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza departamentul',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const addDepartment = useCallback(async (data: Omit<Department, 'id'>) => {
    try {
      const { data: newDept, error } = await supabase
        .from('departments')
        .insert({
          name: data.name,
          description: data.description,
          color: data.color,
          sub_departments: data.subDepartments?.map(s => ({
            id: s.id,
            name: s.name,
          })) || [],
        })
        .select()
        .single();

      if (error) throw error;

      const mapped: Department = {
        id: newDept.id,
        name: newDept.name,
        description: newDept.description || '',
        color: newDept.color as Department['color'],
        employeeCount: 0,
        subDepartments: (newDept.sub_departments as { id: string; name: string }[] | null)?.map(s => ({
          id: s.id,
          name: s.name,
          employeeCount: 0,
        })) || [],
      };

      setDepartments(prev => [...prev, mapped]);

      toast({
        title: 'Succes',
        description: 'Departamentul a fost adăugat',
      });
    } catch (error) {
      console.error('Error adding department:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut adăuga departamentul',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDepartments(prev => prev.filter(d => d.id !== id));

      toast({
        title: 'Succes',
        description: 'Departamentul a fost șters',
      });
    } catch (error) {
      console.error('Error deleting department:', error);
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut șterge departamentul',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const productionOperations = useMemo(() => {
    const productionDept = departments.find(d => d.name === 'Producție');
    return productionDept?.subDepartments?.map(sub => ({
      id: sub.id,
      name: sub.name,
    })) || [];
  }, [departments]);

  return (
    <DepartmentsContext.Provider value={{ 
      departments, 
      setDepartments, 
      productionOperations, 
      isLoading,
      refetch: fetchDepartments,
      updateDepartment,
      addDepartment,
      deleteDepartment,
    }}>
      {children}
    </DepartmentsContext.Provider>
  );
}

export function useDepartments() {
  const context = useContext(DepartmentsContext);
  if (!context) {
    throw new Error('useDepartments must be used within a DepartmentsProvider');
  }
  return context;
}
