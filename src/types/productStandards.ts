export interface ProductFamily {
  id: string;
  name: string;
  label: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductType {
  id: string;
  family_id: string;
  name: string;
  label: string;
  requires_dtp: boolean;
  requires_mockup: boolean;
  requires_client_approval: boolean;
  workflow_template_id: string | null;
  recipe_skeleton_id: string | null;
  active: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  family_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateStage {
  id: string;
  workflow_template_id: string;
  stage_name: string;
  stage_type: 'production' | 'approval';
  department_name: string | null;
  sequence: number;
  is_required: boolean;
  blocks_next_stage: boolean;
  notes: string | null;
  created_at: string;
}

export interface RecipeSkeleton {
  id: string;
  name: string;
  description: string | null;
  family_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeSkeletonComponent {
  id: string;
  recipe_skeleton_id: string;
  component_name: string;
  component_type: 'material' | 'service';
  sort_order: number;
  notes: string | null;
  created_at: string;
}
