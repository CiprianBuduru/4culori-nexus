import { Employee, Department, Product } from '@/types';

export const departments: Department[] = [
  {
    id: '5',
    name: 'Management',
    description: 'Departamentul de management și conducere',
    color: 'green',
    employeeCount: 0, // calculated dynamically
  },
  {
    id: '1',
    name: 'Vânzări',
    description: 'Departamentul de vânzări și relații clienți',
    color: 'blue',
    employeeCount: 0,
  },
  {
    id: '6',
    name: 'DTP',
    description: 'Departamentul de prepress și design grafic',
    color: 'orange',
    employeeCount: 0,
  },
  {
    id: '2',
    name: 'Producție',
    description: 'Departamentul de producție și manufacturing',
    color: 'teal',
    employeeCount: 0,
    subDepartments: [
      { id: 'sub-1', name: 'Print 3D', employeeCount: 0 },
      { id: 'sub-2', name: 'Gravură', employeeCount: 0 },
      { id: 'sub-3', name: 'DTF-UV', employeeCount: 0 },
      { id: 'sub-4', name: 'Broderie', employeeCount: 0 },
      { id: 'sub-5', name: 'Tipografie', employeeCount: 0 },
    ],
  },
  {
    id: '3',
    name: 'Marketing',
    description: 'Departamentul de marketing și comunicare',
    color: 'pink',
    employeeCount: 0,
  },
  {
    id: '4',
    name: 'Financiar',
    description: 'Departamentul financiar-contabil',
    color: 'purple',
    employeeCount: 0,
  },
];

export const employees: Employee[] = [];

export const products: Product[] = [
  {
    id: '1',
    name: 'Set Pixuri Colorate Premium',
    sku: 'PIX-COL-001',
    description: 'Set de 12 pixuri colorate de înaltă calitate',
    price: 45.99,
    stock: 250,
    category: 'Papetărie',
    status: 'active',
  },
  {
    id: '2',
    name: 'Carton Colorat A4',
    sku: 'CART-A4-002',
    description: 'Pachet 100 coli carton colorat A4',
    price: 29.99,
    stock: 500,
    category: 'Hârtie',
    status: 'active',
  },
  {
    id: '3',
    name: 'Acuarele Profesionale',
    sku: 'ACU-PRO-003',
    description: 'Set 24 culori acuarele profesionale',
    price: 89.99,
    stock: 75,
    category: 'Artă',
    status: 'active',
  },
  {
    id: '4',
    name: 'Markere Duble',
    sku: 'MARK-DUB-004',
    description: 'Set 36 markere cu vârf dublu',
    price: 129.99,
    stock: 120,
    category: 'Artă',
    status: 'active',
  },
  {
    id: '5',
    name: 'Bloc Desen Premium',
    sku: 'BLOC-DES-005',
    description: 'Bloc desen A3 cu 50 foi',
    price: 34.99,
    stock: 200,
    category: 'Hârtie',
    status: 'active',
  },
];
