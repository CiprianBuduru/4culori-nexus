import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  ProductFamily,
  ProductType,
  WorkflowTemplate,
  WorkflowTemplateStage,
  RecipeSkeleton,
  RecipeSkeletonComponent,
} from '@/types/productStandards';

// ---- Product Families ----
export function useProductFamilies() {
  return useQuery({
    queryKey: ['product_families'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_families')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as ProductFamily[];
    },
  });
}

// ---- Product Types ----
export function useProductTypes() {
  return useQuery({
    queryKey: ['product_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as ProductType[];
    },
  });
}

export function useUpdateProductType() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (pt: Partial<ProductType> & { id: string }) => {
      const { id, created_at, updated_at, ...rest } = pt as any;
      const { error } = await supabase.from('product_types').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product_types'] });
      toast({ title: 'Tip produs actualizat' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });
}

// ---- Workflow Templates ----
export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as WorkflowTemplate[];
    },
  });
}

export function useWorkflowTemplateStages(templateId?: string) {
  return useQuery({
    queryKey: ['workflow_template_stages', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_template_stages')
        .select('*')
        .eq('workflow_template_id', templateId!)
        .order('sequence');
      if (error) throw error;
      return data as WorkflowTemplateStage[];
    },
    enabled: !!templateId,
  });
}

export function useMutateWorkflowStage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const addStage = useMutation({
    mutationFn: async (stage: Omit<WorkflowTemplateStage, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('workflow_template_stages').insert(stage as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow_template_stages'] });
      toast({ title: 'Etapă adăugată' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflow_template_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow_template_stages'] });
      toast({ title: 'Etapă ștearsă' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  return { addStage, deleteStage };
}

// ---- Recipe Skeletons ----
export function useRecipeSkeletons() {
  return useQuery({
    queryKey: ['recipe_skeletons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_skeletons')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as RecipeSkeleton[];
    },
  });
}

export function useRecipeSkeletonComponents(skeletonId?: string) {
  return useQuery({
    queryKey: ['recipe_skeleton_components', skeletonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipe_skeleton_components')
        .select('*')
        .eq('recipe_skeleton_id', skeletonId!)
        .order('sort_order');
      if (error) throw error;
      return data as RecipeSkeletonComponent[];
    },
    enabled: !!skeletonId,
  });
}

export function useMutateRecipeComponent() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const addComponent = useMutation({
    mutationFn: async (comp: Omit<RecipeSkeletonComponent, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('recipe_skeleton_components').insert(comp as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe_skeleton_components'] });
      toast({ title: 'Component adăugat' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  const deleteComponent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipe_skeleton_components').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipe_skeleton_components'] });
      toast({ title: 'Component șters' });
    },
    onError: () => toast({ title: 'Eroare', variant: 'destructive' }),
  });

  return { addComponent, deleteComponent };
}
