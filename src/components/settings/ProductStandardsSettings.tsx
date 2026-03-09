import { useState } from 'react';
import { Loader2, ChevronRight, Box, Layers, GitBranch, BookOpen, Check, X, ArrowRight, Trash2, Plus, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useProductFamilies,
  useProductTypes,
  useUpdateProductType,
  useWorkflowTemplates,
  useWorkflowTemplateStages,
  useRecipeSkeletons,
  useRecipeSkeletonComponents,
  useMutateWorkflowStage,
  useMutateRecipeComponent,
} from '@/hooks/useProductStandards';

const PRODUCTION_DEPARTMENTS = [
  'DTP', 'Print Digital', 'UV Print', 'Gravura / Laser', 'DTF', 'DTF-UV',
  'Print de mari dimensiuni / Cutter plotter', 'Presa', 'Broderie', '3D print',
  'Finisari', 'Legatorie', 'Ambalare', 'Logistica',
];

type SubTab = 'families' | 'workflows' | 'recipes';

export function ProductStandardsSettings() {
  const [subTab, setSubTab] = useState<SubTab>('families');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedSkeletonId, setSelectedSkeletonId] = useState<string | null>(null);

  const { data: families, isLoading: loadingFamilies } = useProductFamilies();
  const { data: productTypes, isLoading: loadingTypes } = useProductTypes();
  const { data: workflows } = useWorkflowTemplates();
  const { data: skeletons } = useRecipeSkeletons();
  const updateType = useUpdateProductType();

  const tabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'families', label: 'Familii & Tipuri', icon: Layers },
    { id: 'workflows', label: 'Workflow Templates', icon: GitBranch },
    { id: 'recipes', label: 'Recipe Skeletons', icon: BookOpen },
  ];

  if (loadingFamilies || loadingTypes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Standarde Produse</h2>
        <p className="text-sm text-muted-foreground">
          Familii, tipuri de produse, workflow-uri și schelet rețete
        </p>
      </div>
      <Separator />

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                subTab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === 'families' && (
        <FamiliesAndTypes
          families={families || []}
          productTypes={productTypes || []}
          workflows={workflows || []}
          skeletons={skeletons || []}
          selectedFamilyId={selectedFamilyId}
          setSelectedFamilyId={setSelectedFamilyId}
          editingTypeId={editingTypeId}
          setEditingTypeId={setEditingTypeId}
          updateType={updateType}
        />
      )}

      {subTab === 'workflows' && (
        <WorkflowsView
          workflows={workflows || []}
          families={families || []}
          selectedWorkflowId={selectedWorkflowId}
          setSelectedWorkflowId={setSelectedWorkflowId}
        />
      )}

      {subTab === 'recipes' && (
        <RecipeSkeletonsView
          skeletons={skeletons || []}
          families={families || []}
          selectedSkeletonId={selectedSkeletonId}
          setSelectedSkeletonId={setSelectedSkeletonId}
        />
      )}
    </div>
  );
}

// ---- Families & Types sub-component ----
function FamiliesAndTypes({
  families, productTypes, workflows, skeletons,
  selectedFamilyId, setSelectedFamilyId,
  editingTypeId, setEditingTypeId, updateType,
}: any) {
  const typesForFamily = selectedFamilyId
    ? productTypes.filter((t: any) => t.family_id === selectedFamilyId)
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Families list */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Familii Produse</Label>
        {families.map((f: any) => (
          <button
            key={f.id}
            onClick={() => { setSelectedFamilyId(f.id); setEditingTypeId(null); }}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
              selectedFamilyId === f.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{f.label}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {productTypes.filter((t: any) => t.family_id === f.id).length}
            </Badge>
          </button>
        ))}
      </div>

      {/* Types list */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          {selectedFamilyId ? 'Tipuri Produse' : 'Selectează o familie'}
        </Label>
        {typesForFamily.map((t: any) => (
          <button
            key={t.id}
            onClick={() => setEditingTypeId(t.id)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
              editingTypeId === t.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <span className="text-sm font-medium">{t.label}</span>
            <div className="flex items-center gap-1">
              {t.requires_mockup && <Badge variant="outline" className="text-xs">Mock-up</Badge>}
              {t.requires_client_approval && <Badge variant="outline" className="text-xs">BdT</Badge>}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>

      {/* Type detail / edit */}
      <div>
        {editingTypeId ? (
          <ProductTypeEditor
            productType={productTypes.find((t: any) => t.id === editingTypeId)}
            workflows={workflows}
            skeletons={skeletons}
            updateType={updateType}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Selectează un tip de produs
          </div>
        )}
      </div>
    </div>
  );
}

function ProductTypeEditor({ productType, workflows, skeletons, updateType }: any) {
  const [mockup, setMockup] = useState(productType.requires_mockup);
  const [approval, setApproval] = useState(productType.requires_client_approval);
  const [wfId, setWfId] = useState(productType.workflow_template_id || '');
  const [rsId, setRsId] = useState(productType.recipe_skeleton_id || '');
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    updateType.mutate({
      id: productType.id,
      requires_mockup: mockup,
      requires_client_approval: approval,
      workflow_template_id: wfId || null,
      recipe_skeleton_id: rsId || null,
    });
    setDirty(false);
  };

  return (
    <div className="space-y-4 p-3 rounded-lg border border-border">
      <div>
        <h3 className="font-semibold text-foreground">{productType.label}</h3>
        <p className="text-xs text-muted-foreground">{productType.name}</p>
      </div>
      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Necesită DTP</Label>
          <Badge variant="default" className="text-xs">Da (implicit)</Badge>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Necesită Mock-up</Label>
          <Switch checked={mockup} onCheckedChange={(v) => { setMockup(v); setDirty(true); }} />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Necesită Bun de Tipar</Label>
          <Switch checked={approval} onCheckedChange={(v) => { setApproval(v); setDirty(true); }} />
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Workflow Template</Label>
          <Select value={wfId} onValueChange={(v) => { setWfId(v); setDirty(true); }}>
            <SelectTrigger><SelectValue placeholder="Selectează..." /></SelectTrigger>
            <SelectContent>
              {workflows.map((w: any) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Recipe Skeleton</Label>
          <Select value={rsId} onValueChange={(v) => { setRsId(v); setDirty(true); }}>
            <SelectTrigger><SelectValue placeholder="Selectează..." /></SelectTrigger>
            <SelectContent>
              {skeletons.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dirty && (
        <Button size="sm" onClick={handleSave} disabled={updateType.isPending} className="w-full">
          <Check className="h-4 w-4 mr-1" /> Salvează
        </Button>
      )}
    </div>
  );
}

// ---- Workflows sub-component ----
function WorkflowsView({ workflows, families, selectedWorkflowId, setSelectedWorkflowId }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* List */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Workflow Templates</Label>
        {workflows.map((w: any) => {
          const family = families.find((f: any) => f.id === w.family_id);
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWorkflowId(w.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                selectedWorkflowId === w.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div>
                <p className="font-medium text-sm">{w.name}</p>
                {family && <p className="text-xs text-muted-foreground">{family.label}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div>
        {selectedWorkflowId ? (
          <WorkflowStagesDetail workflowId={selectedWorkflowId} />
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Selectează un workflow
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowStagesDetail({ workflowId }: { workflowId: string }) {
  const { data: stages, isLoading } = useWorkflowTemplateStages(workflowId);
  const { addStage, deleteStage } = useMutateWorkflowStage();
  const [adding, setAdding] = useState(false);
  const [newStage, setNewStage] = useState({ stage_name: '', stage_type: 'production', department_name: '', is_required: true, blocks_next_stage: true });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />;

  const handleAdd = () => {
    const maxSeq = Math.max(0, ...(stages || []).map((s) => s.sequence));
    addStage.mutate({
      workflow_template_id: workflowId,
      stage_name: newStage.stage_name,
      stage_type: newStage.stage_type,
      department_name: newStage.department_name || null,
      sequence: maxSeq + 1,
      is_required: newStage.is_required,
      blocks_next_stage: newStage.blocks_next_stage,
      notes: null,
    });
    setAdding(false);
    setNewStage({ stage_name: '', stage_type: 'production', department_name: '', is_required: true, blocks_next_stage: true });
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Etape Workflow</Label>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-3 w-3 mr-1" /> Adaugă
        </Button>
      </div>

      <div className="space-y-1">
        {stages?.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <span className="text-xs font-mono text-muted-foreground w-5">{s.sequence}</span>
            {s.stage_type === 'approval' ? (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">Aprobare</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Producție</Badge>
            )}
            <span className="text-sm font-medium flex-1">{s.stage_name}</span>
            {s.department_name && (
              <span className="text-xs text-muted-foreground">{s.department_name}</span>
            )}
            {i < (stages?.length || 0) - 1 && s.blocks_next_stage && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteStage.mutate(s.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="space-y-2 p-3 rounded-md border border-primary/30 bg-primary/5">
          <Input placeholder="Nume etapă" value={newStage.stage_name} onChange={(e) => setNewStage((p) => ({ ...p, stage_name: e.target.value }))} />
          <div className="flex gap-2">
            <Select value={newStage.stage_type} onValueChange={(v) => setNewStage((p) => ({ ...p, stage_type: v }))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Producție</SelectItem>
                <SelectItem value="approval">Aprobare</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newStage.department_name} onValueChange={(v) => setNewStage((p) => ({ ...p, department_name: v }))}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Departament" /></SelectTrigger>
              <SelectContent>
                {PRODUCTION_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <Button size="sm" onClick={handleAdd} disabled={!newStage.stage_name}>
              <Check className="h-3 w-3 mr-1" /> Adaugă
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              <X className="h-3 w-3 mr-1" /> Anulează
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Recipe Skeletons sub-component ----
function RecipeSkeletonsView({ skeletons, families, selectedSkeletonId, setSelectedSkeletonId }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Recipe Skeletons</Label>
        {skeletons.map((s: any) => {
          const family = families.find((f: any) => f.id === s.family_id);
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSkeletonId(s.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left',
                selectedSkeletonId === s.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div>
                <p className="font-medium text-sm">{s.name}</p>
                {family && <p className="text-xs text-muted-foreground">{family.label}</p>}
                {s.description && <p className="text-xs text-muted-foreground/70 mt-0.5">{s.description}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <div>
        {selectedSkeletonId ? (
          <RecipeComponentsDetail skeletonId={selectedSkeletonId} />
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Selectează o rețetă skeleton
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeComponentsDetail({ skeletonId }: { skeletonId: string }) {
  const { data: components, isLoading } = useRecipeSkeletonComponents(skeletonId);
  const { addComponent, deleteComponent } = useMutateRecipeComponent();
  const [adding, setAdding] = useState(false);
  const [newComp, setNewComp] = useState({ component_name: '', component_type: 'material' });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />;

  const handleAdd = () => {
    const maxOrder = Math.max(0, ...(components || []).map((c) => c.sort_order));
    addComponent.mutate({
      recipe_skeleton_id: skeletonId,
      component_name: newComp.component_name,
      component_type: newComp.component_type,
      sort_order: maxOrder + 1,
      notes: null,
    });
    setAdding(false);
    setNewComp({ component_name: '', component_type: 'material' });
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Componente</Label>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-3 w-3 mr-1" /> Adaugă
        </Button>
      </div>

      <div className="space-y-1">
        {components?.map((c) => (
          <div key={c.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <span className="text-xs font-mono text-muted-foreground w-5">{c.sort_order}</span>
            <Badge variant={c.component_type === 'material' ? 'default' : 'secondary'} className="text-xs">
              {c.component_type === 'material' ? 'Material' : 'Serviciu'}
            </Badge>
            <span className="text-sm font-medium flex-1">{c.component_name}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteComponent.mutate(c.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="space-y-2 p-3 rounded-md border border-primary/30 bg-primary/5">
          <Input placeholder="Nume component" value={newComp.component_name} onChange={(e) => setNewComp((p) => ({ ...p, component_name: e.target.value }))} />
          <Select value={newComp.component_type} onValueChange={(v) => setNewComp((p) => ({ ...p, component_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="service">Serviciu</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-4">
            <Button size="sm" onClick={handleAdd} disabled={!newComp.component_name}>
              <Check className="h-3 w-3 mr-1" /> Adaugă
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              <X className="h-3 w-3 mr-1" /> Anulează
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
