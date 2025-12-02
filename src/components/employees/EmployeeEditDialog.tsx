import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee, Department } from '@/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';

const employeeSchema = z.object({
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere').max(100),
  email: z.string().email('Adresă de email invalidă'),
  phone: z.string().min(10, 'Numărul de telefon trebuie să aibă minim 10 caractere'),
  position: z.string().min(2, 'Poziția trebuie să aibă minim 2 caractere'),
  departmentId: z.string().min(1, 'Selectează un departament'),
  serviceIds: z.array(z.string()).optional(),
  hireDate: z.string().min(1, 'Selectează data angajării'),
  birthDate: z.string().optional(),
  vacationDays: z.coerce.number().min(0).max(365).optional(),
  status: z.enum(['active', 'inactive']),
  company: z.enum(['LMG', 'EQS']).optional(),
  avatar: z.string().optional(),
  isProtectedUnit: z.boolean().optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeEditDialogProps {
  employee: Employee | null;
  departments: Department[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EmployeeFormData) => void;
  isLoading?: boolean;
}

export function EmployeeEditDialog({
  employee,
  departments,
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}: EmployeeEditDialogProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      position: '',
      departmentId: '',
      serviceIds: [],
      hireDate: '',
      birthDate: '',
      vacationDays: 21,
      status: 'active',
      company: undefined,
      avatar: undefined,
      isProtectedUnit: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (employee) {
        form.reset({
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          position: employee.position,
          departmentId: employee.departmentId,
          serviceIds: employee.serviceIds ?? [],
          hireDate: employee.hireDate,
          birthDate: employee.birthDate ?? '',
          vacationDays: employee.vacationDays ?? 21,
          status: employee.status,
          company: employee.company,
          avatar: employee.avatar,
          isProtectedUnit: employee.isProtectedUnit ?? false,
        });
        setAvatarUrl(employee.avatar);
      } else {
        form.reset({
          name: '',
          email: '',
          phone: '',
          position: '',
          departmentId: '',
          serviceIds: [],
          hireDate: '',
          birthDate: '',
          vacationDays: 21,
          status: 'active',
          company: undefined,
          avatar: undefined,
          isProtectedUnit: false,
        });
        setAvatarUrl(undefined);
      }
    }
  }, [open, employee, form]);

  const watchedDepartmentId = form.watch('departmentId');
  
  // Find the Production department and its services
  const productionDept = departments.find(d => d.name === 'Producție');
  const isProductionDepartment = watchedDepartmentId === productionDept?.id;
  const availableServices = productionDept?.subDepartments ?? [];

  const watchedName = form.watch('name');

  const handleAvatarChange = (url: string | undefined) => {
    setAvatarUrl(url);
    form.setValue('avatar', url);
  };

  const handleSubmit = (data: EmployeeFormData) => {
    // Clear serviceIds if not in Production department
    if (!isProductionDepartment) {
      data.serviceIds = [];
    }
    data.avatar = avatarUrl;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editează Angajat' : 'Adaugă Angajat'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex justify-center pb-2">
              <AvatarUpload
                value={avatarUrl}
                onChange={handleAvatarChange}
                employeeName={watchedName}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nume complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Ion Popescu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ion@4culori.ro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="0722 123 456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poziție</FormLabel>
                    <FormControl>
                      <Input placeholder="Designer Grafic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departament</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectează..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Services multi-select - only for Production department */}
            {isProductionDepartment && availableServices.length > 0 && (
              <FormField
                control={form.control}
                name="serviceIds"
                render={() => (
                  <FormItem>
                    <FormLabel>Servicii (poate efectua)</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableServices.map((service) => (
                        <FormField
                          key={service.id}
                          control={form.control}
                          name="serviceIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={service.id}
                                className="flex flex-row items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(service.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value ?? [];
                                      return checked
                                        ? field.onChange([...currentValue, service.id])
                                        : field.onChange(
                                            currentValue.filter((value) => value !== service.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {service.name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data angajării</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data nașterii</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vacationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zile concediu / an</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={365} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activ</SelectItem>
                        <SelectItem value="inactive">Inactiv</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Firmă</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="LMG" id="company-lmg" />
                        <label htmlFor="company-lmg" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500" />
                          LMG
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="EQS" id="company-eqs" />
                        <label htmlFor="company-eqs" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          EQS
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isProtectedUnit"
              render={({ field }) => (
                <FormItem className={`flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 ${field.value ? 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600' : ''}`}>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className={field.value ? 'border-yellow-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-yellow-950' : ''}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Unitate Protejată
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

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
                {employee ? 'Salvează' : 'Adaugă'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
