import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { Department } from '@/types';
import { departments as initialDepartments } from '@/data/mockData';

interface DepartmentsContextType {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  productionOperations: { id: string; name: string }[];
}

const DepartmentsContext = createContext<DepartmentsContextType | undefined>(undefined);

export function DepartmentsProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);

  const productionOperations = useMemo(() => {
    const productionDept = departments.find(d => d.name === 'Producție');
    return productionDept?.subDepartments?.map(sub => ({
      id: sub.id,
      name: sub.name,
    })) || [];
  }, [departments]);

  return (
    <DepartmentsContext.Provider value={{ departments, setDepartments, productionOperations }}>
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
