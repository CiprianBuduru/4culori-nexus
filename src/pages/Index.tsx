import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Users, Building2, Package, TrendingUp } from 'lucide-react';
import { employees, departments, products } from '@/data/mockData';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { ProductCard } from '@/components/products/ProductCard';

const Index = () => {
  const totalRevenue = products.reduce((acc, p) => acc + (p.price * p.stock * 0.1), 0);
  
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Bine ai venit în sistemul de management 4culori
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Angajați"
            value={employees.length}
            icon={<Users className="h-6 w-6" />}
            trend={{ value: 12, isPositive: true }}
            color="blue"
          />
          <StatCard
            title="Departamente"
            value={departments.length}
            icon={<Building2 className="h-6 w-6" />}
            color="teal"
          />
          <StatCard
            title="Produse"
            value={products.length}
            icon={<Package className="h-6 w-6" />}
            trend={{ value: 8, isPositive: true }}
            color="orange"
          />
          <StatCard
            title="Venituri Estimate"
            value={`${totalRevenue.toFixed(0)} RON`}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={{ value: 15, isPositive: true }}
            color="green"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent Employees */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Angajați Recenți
            </h2>
            <div className="space-y-4">
              {employees.slice(0, 3).map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  department={departments.find((d) => d.id === employee.departmentId)}
                />
              ))}
            </div>
          </div>

          {/* Recent Products */}
          <div>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Produse Populare
            </h2>
            <div className="space-y-4">
              {products.slice(0, 3).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
