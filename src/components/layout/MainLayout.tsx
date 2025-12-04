import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <NotificationCenter />
        </div>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}