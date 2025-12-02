export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  departmentId: string;
  serviceIds?: string[]; // Multiple services for Production employees
  hireDate: string;
  birthDate?: string;
  vacationDays?: number; // Resets at start of new year
  status: 'active' | 'inactive';
  avatar?: string;
  company?: 'LMG' | 'EQS';
  isProtectedUnit?: boolean;
  salariuBrut?: number;
  salariuNet?: number;
  accessLevel?: number; // 0-4, where 4=Administrator
}

export interface SubDepartment {
  id: string;
  name: string;
  employeeCount: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  managerId?: string;
  color: 'blue' | 'teal' | 'orange' | 'green' | 'purple' | 'pink';
  employeeCount: number;
  subDepartments?: SubDepartment[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive' | 'discontinued';
}
