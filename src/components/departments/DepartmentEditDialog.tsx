import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Department, SubDepartment } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const subDepartmentSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  employeeCount: z.coerce.number().min(0),
});

const departmentSchema = z.object({
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere').max(100),
  description: z.string().min(5, 'Descrierea trebuie să aibă minim 5 caractere').max(500),
  color: z.enum(['blue', 'teal', 'orange', 'green']),
  employeeCount: z.coerce.number().min(0, 'Numărul de angajați nu poate fi negativ'),
  subDepartments: z.array(subDepartmentSchema).optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface DepartmentEditDialogProps {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DepartmentFormData) => void;
  isLoading?: boolean;
}

const colorOptions = [
  { value: 'blue', label: 'Classic Blue', className: 'bg-brand-blue' },
  { value: 'teal', label: 'Living Coral', className: 'bg-brand-teal' },
  { value: 'orange', label: 'Illuminating', className: 'bg-brand-orange' },
  { value: 'green', label: 'Very Peri', className: 'bg-brand-green' },
];

export function DepartmentEditDialog({
  department,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: DepartmentEditDialogProps) {
  const isProduction = department?.name === 'Producție';

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name ?? '',
      description: department?.description ?? '',
      color: department?.color ?? 'blue',
      employeeCount: department?.employeeCount ?? 0,
      subDepartments: department?.subDepartments ?? [],
    },
    values: department ? {
      name: department.name,
      description: department.description,
      color: department.color,
      employeeCount: department.employeeCount,
      subDepartments: department.subDepartments ?? [],
    } : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subDepartments',
  });

  const handleSubmit = (data: DepartmentFormData) => {
    onSave(data);
  };

  const addService = () => {
    append({ id: crypto.randomUUID(), name: '', employeeCount: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {department ? 'Editează Departament' : 'Adaugă Departament'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume departament</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Design Grafic" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descriere</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrierea departamentului..." 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Culoare</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {colorOptions.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${color.className}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nr. angajați</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Services Section - Only for Production department */}
            {isProduction && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base font-semibold">Servicii</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addService}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Adaugă
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nu există servicii. Adaugă primul serviciu.
                  </p>
                )}

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`subDepartments.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Nume serviciu" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`subDepartments.${index}.employeeCount`}
                        render={({ field }) => (
                          <FormItem className="w-20">
                            <FormControl>
                              <Input type="number" min={0} placeholder="Nr." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Anulează
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {department ? 'Salvează' : 'Adaugă'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
