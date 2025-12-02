export type AppRole = 'administrator' | 'director' | 'sef_productie' | 'operator';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  departments: string[];
}

export interface AuthUser {
  profile: UserProfile | null;
  role: UserRole | null;
}

// Role-based access configuration
export const roleAccess: Record<AppRole, {
  label: string;
  pages: string[];
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAllData: boolean;
}> = {
  administrator: {
    label: 'Administrator',
    pages: ['/', '/employees', '/departments', '/products', '/price-calculator', '/production-calendar', '/settings', '/clients', '/orders'],
    canManageUsers: true,
    canManageSettings: true,
    canViewAllData: true,
  },
  director: {
    label: 'Director',
    pages: ['/', '/employees', '/departments', '/products', '/price-calculator', '/production-calendar', '/clients', '/orders'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: true,
  },
  sef_productie: {
    label: 'Șef Producție',
    pages: ['/', '/employees', '/products', '/production-calendar', '/clients', '/orders'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
  },
  operator: {
    label: 'Operator',
    pages: ['/', '/production-calendar'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
  },
};

// Predefined employees
export const predefinedEmployees = [
  {
    email: 'ciprian@4culori.ro',
    name: 'Ciprian Buduru',
    phone: '0723.293.740',
    role: 'administrator' as AppRole,
    departments: [],
  },
  {
    email: 'nicol@4culori.ro',
    name: 'Nicoleta Buduru',
    phone: '0723.567.740',
    role: 'director' as AppRole,
    departments: [],
  },
  {
    email: 'gabi@4culori.ro',
    name: 'Gabi Dinescu',
    phone: '0784.771.919',
    role: 'sef_productie' as AppRole,
    departments: [],
  },
  {
    email: 'alex@4culori.ro',
    name: 'Alex Ciuraru',
    phone: '0756609745',
    role: 'operator' as AppRole,
    departments: ['Print 3D', 'Gravura', 'DTF-UV', 'Broderie'],
  },
];
