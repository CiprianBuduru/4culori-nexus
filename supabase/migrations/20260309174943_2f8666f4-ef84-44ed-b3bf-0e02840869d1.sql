
-- Product Families
CREATE TABLE public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage product_families" ON public.product_families FOR ALL USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Authenticated can view product_families" ON public.product_families FOR SELECT USING (auth.uid() IS NOT NULL);

-- Product Types
CREATE TABLE public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.product_families(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  requires_dtp boolean NOT NULL DEFAULT true,
  requires_mockup boolean NOT NULL DEFAULT false,
  requires_client_approval boolean NOT NULL DEFAULT true,
  workflow_template_id uuid,
  recipe_skeleton_id uuid,
  active boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage product_types" ON public.product_types FOR ALL USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Authenticated can view product_types" ON public.product_types FOR SELECT USING (auth.uid() IS NOT NULL);

-- Workflow Templates
CREATE TABLE public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workflow_templates" ON public.workflow_templates FOR ALL USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Authenticated can view workflow_templates" ON public.workflow_templates FOR SELECT USING (auth.uid() IS NOT NULL);

-- Workflow Template Stages
CREATE TABLE public.workflow_template_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  stage_type text NOT NULL DEFAULT 'production',
  department_name text,
  sequence integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT true,
  blocks_next_stage boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_template_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage workflow_template_stages" ON public.workflow_template_stages FOR ALL USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Authenticated can view workflow_template_stages" ON public.workflow_template_stages FOR SELECT USING (auth.uid() IS NOT NULL);

-- Recipe Skeletons
CREATE TABLE public.recipe_skeletons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_skeletons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage recipe_skeletons" ON public.recipe_skeletons FOR ALL USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Authenticated can view recipe_skeletons" ON public.recipe_skeletons FOR SELECT USING (auth.uid() IS NOT NULL);

-- Recipe Skeleton Components
CREATE TABLE public.recipe_skeleton_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_skeleton_id uuid NOT NULL REFERENCES public.recipe_skeletons(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  component_type text NOT NULL DEFAULT 'material',
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_skeleton_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage recipe_skeleton_components" ON public.recipe_skeleton_components FOR ALL USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'director'));
CREATE POLICY "Authenticated can view recipe_skeleton_components" ON public.recipe_skeleton_components FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add FK constraints for product_types references
ALTER TABLE public.product_types ADD CONSTRAINT product_types_workflow_template_id_fkey FOREIGN KEY (workflow_template_id) REFERENCES public.workflow_templates(id) ON DELETE SET NULL;
ALTER TABLE public.product_types ADD CONSTRAINT product_types_recipe_skeleton_id_fkey FOREIGN KEY (recipe_skeleton_id) REFERENCES public.recipe_skeletons(id) ON DELETE SET NULL;

-- Updated_at triggers
CREATE TRIGGER update_product_families_updated_at BEFORE UPDATE ON public.product_families FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_product_types_updated_at BEFORE UPDATE ON public.product_types FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON public.workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_recipe_skeletons_updated_at BEFORE UPDATE ON public.recipe_skeletons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
