// Production Order types and constants

export type ProductionOrderStatus = 'nou' | 'de_preluat' | 'in_lucru' | 'blocat' | 'in_asteptare' | 'ambalare' | 'finalizat';
export type ProductionOrderPriority = 'normal' | 'urgent' | 'foarte_urgent';
export type StageStatus = 'nou' | 'de_preluat' | 'in_lucru' | 'blocat' | 'in_asteptare' | 'finalizat';

export interface ProductionOrder {
  id: string;
  order_number: string;
  client_name: string | null;
  title: string;
  product_type: string | null;
  quantity: number;
  priority: ProductionOrderPriority;
  due_date: string | null;
  status: ProductionOrderStatus;
  notes: string | null;
  production_manager_id: string | null;
  created_by: string | null;
  source_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionStage {
  id: string;
  production_order_id: string;
  stage_name: string;
  department_name: string;
  assigned_user_id: string | null;
  sequence: number;
  status: StageStatus;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PRODUCTION_DEPARTMENTS = [
  'DTP',
  'Print Digital',
  'UV Print',
  'Gravura / Laser',
  'DTF',
  'DTF-UV',
  'Print de mari dimensiuni / Cutter plotter',
  'Presa',
  'Broderie',
  '3D print',
  'Finisari',
  'Legatorie',
  'Ambalare',
  'Logistica',
] as const;

export const ORDER_STATUS_CONFIG: Record<ProductionOrderStatus, { label: string; color: string }> = {
  nou: { label: 'Nou', color: 'bg-muted text-muted-foreground' },
  de_preluat: { label: 'De preluat', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  in_lucru: { label: 'În lucru', color: 'bg-brand-teal/20 text-brand-teal' },
  blocat: { label: 'Blocat', color: 'bg-destructive/20 text-destructive' },
  in_asteptare: { label: 'În așteptare', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  ambalare: { label: 'Ambalare', color: 'bg-brand-purple/20 text-brand-purple' },
  finalizat: { label: 'Finalizat', color: 'bg-brand-green/20 text-brand-green' },
};

export const STAGE_STATUS_CONFIG: Record<StageStatus, { label: string; color: string }> = {
  nou: { label: 'Nou', color: 'bg-muted text-muted-foreground' },
  de_preluat: { label: 'De preluat', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  in_lucru: { label: 'În lucru', color: 'bg-brand-teal/20 text-brand-teal' },
  blocat: { label: 'Blocat', color: 'bg-destructive/20 text-destructive' },
  in_asteptare: { label: 'În așteptare', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  finalizat: { label: 'Finalizat', color: 'bg-brand-green/20 text-brand-green' },
};

export const PRIORITY_CONFIG: Record<ProductionOrderPriority, { label: string; color: string; slaDays: number }> = {
  normal: { label: 'Normal', color: 'bg-muted text-muted-foreground', slaDays: 7 },
  urgent: { label: 'Urgent', color: 'bg-brand-orange/20 text-brand-orange', slaDays: 3 },
  foarte_urgent: { label: 'Foarte urgent', color: 'bg-destructive/20 text-destructive', slaDays: 1 },
};
