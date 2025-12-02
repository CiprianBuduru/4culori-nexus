export type AppRole = 'administrator' | 'director' | 'sef_productie' | 'operator' | 'vizitator';

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

// Role-based access configuration - 5 levels (4 = highest, 0 = lowest)
export const roleAccess: Record<AppRole, {
  level: number;
  label: string;
  pages: string[];
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAllData: boolean;
  canEditData: boolean;
}> = {
  // Nivel 4 - Acces complet
  administrator: {
    level: 4,
    label: 'Administrator',
    pages: ['/', '/employees', '/departments', '/products', '/price-calculator', '/production-calendar', '/settings', '/clients', '/orders'],
    canManageUsers: true,
    canManageSettings: true,
    canViewAllData: true,
    canEditData: true,
  },
  // Nivel 3 - Acces extins (fără setări)
  director: {
    level: 3,
    label: 'Director',
    pages: ['/', '/employees', '/departments', '/products', '/price-calculator', '/production-calendar', '/clients', '/orders'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: true,
    canEditData: true,
  },
  // Nivel 2 - Acces producție
  sef_productie: {
    level: 2,
    label: 'Șef Producție',
    pages: ['/', '/employees', '/products', '/production-calendar', '/clients', '/orders'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
    canEditData: true,
  },
  // Nivel 1 - Acces limitat la departamente proprii
  operator: {
    level: 1,
    label: 'Operator',
    pages: ['/', '/production-calendar'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
    canEditData: false,
  },
  // Nivel 0 - Doar vizualizare dashboard
  vizitator: {
    level: 0,
    label: 'Vizitator',
    pages: ['/'],
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
    canEditData: false,
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
