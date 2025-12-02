import { ProductionTask } from '@/types/production';

// Helper to get dates relative to today
const getDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

export const productionTasks: ProductionTask[] = [
  {
    id: '1',
    title: 'Cutii cadou personalizate - Lot A',
    description: '500 cutii cu folio auriu și embosare',
    departmentId: '2', // Producție
    startDate: getDate(-2),
    endDate: getDate(3),
    status: 'in-progress',
    priority: 'high',
    clientName: 'SC Elegance SRL',
    quantity: 500,
  },
  {
    id: '2',
    title: 'Flyere A5 - Campanie iarnă',
    description: 'Flyere promoționale pentru campania de iarnă',
    departmentId: '2', // Producție
    startDate: getDate(0),
    endDate: getDate(2),
    status: 'in-progress',
    priority: 'medium',
    clientName: 'Fashion Store',
    quantity: 10000,
  },
  {
    id: '3',
    title: 'Design catalog produse',
    description: 'Catalog 48 pagini pentru client retail',
    departmentId: '3', // Marketing
    startDate: getDate(1),
    endDate: getDate(7),
    status: 'pending',
    priority: 'medium',
    clientName: 'TechShop Romania',
  },
  {
    id: '4',
    title: 'Banner mesh 10x3m',
    description: 'Banner exterior pentru eveniment',
    departmentId: '2', // Producție
    startDate: getDate(2),
    endDate: getDate(4),
    status: 'pending',
    priority: 'urgent',
    clientName: 'Event Masters',
    quantity: 1,
  },
  {
    id: '5',
    title: 'Tricouri personalizate echipă',
    description: '150 tricouri cu broderie',
    departmentId: '2', // Producție
    startDate: getDate(-5),
    endDate: getDate(-1),
    status: 'completed',
    priority: 'medium',
    clientName: 'Sports Club Alpha',
    quantity: 150,
  },
  {
    id: '6',
    title: 'Ofertă comercială client nou',
    description: 'Pregătire ofertă pentru lanț de magazine',
    departmentId: '1', // Vânzări
    startDate: getDate(0),
    endDate: getDate(1),
    status: 'in-progress',
    priority: 'high',
    clientName: 'MegaStore Chain',
  },
  {
    id: '7',
    title: 'Facturare luna curentă',
    description: 'Emitere facturi pentru comenzile finalizate',
    departmentId: '4', // Financiar
    startDate: getDate(3),
    endDate: getDate(5),
    status: 'pending',
    priority: 'medium',
  },
  {
    id: '8',
    title: 'Canvas tablouri - Lot mare',
    description: '25 tablouri canvas diverse dimensiuni',
    departmentId: '2', // Producție
    startDate: getDate(4),
    endDate: getDate(8),
    status: 'pending',
    priority: 'low',
    clientName: 'Galeria de Artă Modernă',
    quantity: 25,
  },
  {
    id: '9',
    title: 'Cărți vizită premium',
    description: 'Cărți vizită cu folio și tăiere laser',
    departmentId: '2', // Producție
    startDate: getDate(-1),
    endDate: getDate(1),
    status: 'delayed',
    priority: 'high',
    clientName: 'Avocat Ionescu & Asociații',
    quantity: 500,
    notes: 'Întârziere aprovizionare carton special',
  },
  {
    id: '10',
    title: 'Campanie social media',
    description: 'Postări și grafică pentru campanie online',
    departmentId: '3', // Marketing
    startDate: getDate(0),
    endDate: getDate(14),
    status: 'in-progress',
    priority: 'medium',
    clientName: 'Client intern',
  },
];
