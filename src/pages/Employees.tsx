import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { EmployeeEditDialog } from '@/components/employees/EmployeeEditDialog';
import { VacationCalendar } from '@/components/employees/VacationCalendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Users, CalendarDays, Loader2, Upload, Download } from 'lucide-react';
import { departments } from '@/data/mockData';
import { Employee } from '@/types';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

const Employees = () => {
  const { employees: employeeList, loading, addEmployee, updateEmployee, deleteEmployee, refetch } = useEmployees();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterProtectedUnit, setFilterProtectedUnit] = useState(false);
  const [filterLMG, setFilterLMG] = useState(false);
  const [filterEQS, setFilterEQS] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exportData = employeeList.map(emp => ({
      'ID': emp.id,
      'Nume': emp.name,
      'Email': emp.email,
      'Telefon': emp.phone || '',
      'Poziție': emp.position,
      'Departament': departments.find(d => d.id === emp.departmentId)?.name || emp.departmentId,
      'Data angajării': emp.hireDate || '',
      'Data nașterii': emp.birthDate || '',
      'Zile concediu/an': emp.vacationDays || 21,
      'Status': emp.status,
      'Companie': emp.company || '',
      'Unitate Protejată': emp.isProtectedUnit ? 'Da' : 'Nu',
      'Nivel acces': emp.accessLevel || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Angajați');
    ws['!cols'] = [
      { wch: 36 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }, { wch: 10 }
    ];
    XLSX.writeFile(wb, `angajati_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Export realizat cu succes!' });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

      let updated = 0, added = 0, errors = 0;

      for (const row of jsonData) {
        const name = row['Nume'] || row['name'] || '';
        const email = row['Email'] || row['email'] || '';
        if (!name || !email) continue;

        // Find department ID by name or use directly if it's an ID
        const deptName = row['Departament'] || row['department'] || '';
        const dept = departments.find(d => 
          d.name.toLowerCase() === String(deptName).toLowerCase() || d.id === deptName
        );
        const departmentId = dept?.id || 'management';

        const employeeData = {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          phone: row['Telefon'] || row['phone'] || '',
          position: row['Poziție'] || row['position'] || 'Angajat',
          department_id: departmentId,
          hire_date: row['Data angajării'] || row['hire_date'] || null,
          birth_date: row['Data nașterii'] || row['birth_date'] || null,
          vacation_days_per_year: parseInt(row['Zile concediu/an'] || row['vacation_days'] || 21) || 21,
          status: (row['Status'] || row['status'] || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
          company: row['Companie'] || row['company'] || null,
          is_protected_unit: String(row['Unitate Protejată'] || row['is_protected_unit'] || '').toLowerCase() === 'da' || row['is_protected_unit'] === true,
          access_level: parseInt(row['Nivel acces'] || row['access_level'] || 0) || 0,
          service_ids: [],
        };

        const existingId = row['ID'] || row['id'];
        const existing = existingId 
          ? employeeList.find(emp => emp.id === existingId)
          : employeeList.find(emp => emp.email.toLowerCase() === employeeData.email);

        try {
          if (existing) {
            await supabase.from('employees').update(employeeData).eq('id', existing.id);
            updated++;
          } else {
            await supabase.from('employees').insert(employeeData);
            added++;
          }
        } catch {
          errors++;
        }
      }

      await refetch();
      toast({ 
        title: 'Import finalizat!',
        description: `${added} adăugați, ${updated} actualizați${errors > 0 ? `, ${errors} erori` : ''}`
      });
    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'Eroare la import', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredEmployees = employeeList.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProtectedFilter = !filterProtectedUnit || emp.isProtectedUnit === true;
    
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

  const handleSave = async (data: Omit<Employee, 'id'>) => {
    if (editingEmployee) {
      await updateEmployee(editingEmployee.id, data);
    } else {
      await addEmployee(data);
    }
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = async (employee: Employee) => {
    await deleteEmployee(employee.id, employee.name);
  };

  return (
    <MainLayout>
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Angajați</h1>
            <p className="mt-1 text-muted-foreground">
              Gestionează echipa ta de {employeeList.length} angajați
            </p>
          </div>
          {activeTab === 'employees' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={employeeList.length === 0}>
                <Download className="mr-1 h-4 w-4" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                Import
              </Button>
              <Button className="gap-2" onClick={handleAddNew}>
                <Plus className="h-4 w-4" />
                Adaugă Angajat
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Lista Angajați
            </TabsTrigger>
            <TabsTrigger value="vacations" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendar Concedii
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6 mt-6">
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>

          <TabsContent value="vacations" className="mt-6">
            <VacationCalendar employees={employeeList} />
          </TabsContent>
        </Tabs>
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
