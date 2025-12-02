import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Department } from '@/types';
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
import { Loader2 } from 'lucide-react';

const departmentSchema = z.object({
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere').max(100),
  description: z.string().min(5, 'Descrierea trebuie să aibă minim 5 caractere').max(500),
  color: z.enum(['blue', 'teal', 'orange', 'green']),
  employeeCount: z.coerce.number().min(0, 'Numărul de angajați nu poate fi negativ'),
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
  { value: 'blue', label: 'Albastru', className: 'bg-brand-blue' },
  { value: 'teal', label: 'Turcoaz', className: 'bg-brand-teal' },
  { value: 'orange', label: 'Portocaliu', className: 'bg-brand-orange' },
  { value: 'green', label: 'Verde', className: 'bg-brand-green' },
];

export function DepartmentEditDialog({
  department,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: DepartmentEditDialogProps) {
  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name ?? '',
      description: department?.description ?? '',
      color: department?.color ?? 'blue',
      employeeCount: department?.employeeCount ?? 0,
    },
    values: department ? {
      name: department.name,
      description: department.description,
      color: department.color,
      employeeCount: department.employeeCount,
    } : undefined,
  });

  const handleSubmit = (data: DepartmentFormData) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
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
