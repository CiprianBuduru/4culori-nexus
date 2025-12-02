export interface ProductionTask {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  assignedTo?: string; // employee id
  startDate: string;
  endDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  clientName?: string;
  quantity?: number;
  notes?: string;
}

export const productionStatusLabels: Record<ProductionTask['status'], string> = {
  'pending': 'În așteptare',
  'in-progress': 'În lucru',
  'completed': 'Finalizat',
  'delayed': 'Întârziat',
};

export const productionStatusColors: Record<ProductionTask['status'], string> = {
  'pending': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-brand-blue/20 text-brand-blue',
  'completed': 'bg-brand-green/20 text-brand-green',
  'delayed': 'bg-destructive/20 text-destructive',
};

export const priorityLabels: Record<ProductionTask['priority'], string> = {
  'low': 'Scăzută',
  'medium': 'Medie',
  'high': 'Ridicată',
  'urgent': 'Urgentă',
};
