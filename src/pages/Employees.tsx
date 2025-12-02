import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { EmployeeEditDialog } from '@/components/employees/EmployeeEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Search } from 'lucide-react';
import { employees as initialEmployees, departments } from '@/data/mockData';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Employees = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeList, setEmployeeList] = useState<Employee[]>(initialEmployees);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterProtectedUnit, setFilterProtectedUnit] = useState(false);
  const [filterLMG, setFilterLMG] = useState(false);
  const [filterEQS, setFilterEQS] = useState(false);
  const { toast } = useToast();

  const filteredEmployees = employeeList.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProtectedFilter = !filterProtectedUnit || emp.isProtectedUnit === true;
    
    // Company filter: if both or neither are selected, show all; otherwise filter by selected
    const companyFilterActive = filterLMG || filterEQS;
    const matchesCompanyFilter = !companyFilterActive || 
      (filterLMG && emp.company === 'LMG') || 
      (filterEQS && emp.company === 'EQS');
    
    return matchesSearch && matchesProtectedFilter && matchesCompanyFilter;
  });

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  const handleSave = (data: Omit<Employee, 'id' | 'avatar'>) => {
    if (editingEmployee) {
      // Update existing employee
      setEmployeeList((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id ? { ...emp, ...data } : emp
        )
      );
      toast({
        title: 'Angajat actualizat',
        description: `${data.name} a fost actualizat cu succes`,
      });
    } else {
      // Add new employee
      const newEmployee: Employee = {
        id: crypto.randomUUID(),
        ...data,
      };
      setEmployeeList((prev) => [...prev, newEmployee]);
      toast({
        title: 'Angajat adăugat',
        description: `${data.name} a fost adăugat cu succes`,
      });
    }
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = (employee: Employee) => {
    setEmployeeList((prev) => prev.filter((emp) => emp.id !== employee.id));
    toast({
      title: 'Angajat șters',
      description: `${employee.name} a fost șters`,
      variant: 'destructive',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Angajați</h1>
            <p className="mt-1 text-muted-foreground">
              Gestionează echipa ta de {employeeList.length} angajați
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            Adaugă Angajat
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Caută angajați..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className={`flex items-center space-x-2 rounded-md border px-3 py-2 ${filterProtectedUnit ? 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600' : ''}`}>
            <Checkbox
              id="filter-protected"
              checked={filterProtectedUnit}
              onCheckedChange={(checked) => setFilterProtectedUnit(checked === true)}
              className={filterProtectedUnit ? 'border-yellow-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-yellow-950' : ''}
            />
            <Label htmlFor="filter-protected" className="cursor-pointer text-sm">
              Unitate Protejată
            </Label>
          </div>

          <div className={`flex items-center space-x-2 rounded-md border px-3 py-2 ${filterLMG ? 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600' : ''}`}>
            <Checkbox
              id="filter-lmg"
              checked={filterLMG}
              onCheckedChange={(checked) => setFilterLMG(checked === true)}
              className={filterLMG ? 'border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white' : ''}
            />
            <Label htmlFor="filter-lmg" className="cursor-pointer text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              LMG
            </Label>
          </div>

          <div className={`flex items-center space-x-2 rounded-md border px-3 py-2 ${filterEQS ? 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600' : ''}`}>
            <Checkbox
              id="filter-eqs"
              checked={filterEQS}
              onCheckedChange={(checked) => setFilterEQS(checked === true)}
              className={filterEQS ? 'border-red-600 data-[state=checked]:bg-red-500 data-[state=checked]:text-white' : ''}
            />
            <Label htmlFor="filter-eqs" className="cursor-pointer text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              EQS
            </Label>
          </div>
        </div>

        {/* Employees Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              department={departments.find((d) => d.id === employee.departmentId)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Nu am găsit angajați
            </p>
            <p className="text-sm text-muted-foreground">
              Încearcă să modifici criteriile de căutare
            </p>
          </div>
        )}
      </div>

      <EmployeeEditDialog
        employee={editingEmployee}
        departments={departments}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
      />
    </MainLayout>
  );
};

export default Employees;
