import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Package, 
  Settings,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Angajați', href: '/employees', icon: Users },
  { name: 'Departamente', href: '/departments', icon: Building2 },
  { name: 'Produse', href: '/products', icon: Package },
  { name: 'Setări', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand">
            <Palette className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">4culori</h1>
            <p className="text-xs text-sidebar-foreground/60">CRM & ERP</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'nav-item',
                  isActive && 'active'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Brand Colors Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex justify-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand-blue" />
            <div className="h-3 w-3 rounded-full bg-brand-teal" />
            <div className="h-3 w-3 rounded-full bg-brand-orange" />
            <div className="h-3 w-3 rounded-full bg-brand-green" />
          </div>
          <p className="mt-2 text-center text-xs text-sidebar-foreground/50">
            © 2024 4culori
          </p>
        </div>
      </div>
    </aside>
  );
}
