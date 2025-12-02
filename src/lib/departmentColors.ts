// Centralized department color system
// Maps department IDs and color names to Tailwind classes

export type DepartmentColorName = 'blue' | 'teal' | 'orange' | 'green' | 'purple' | 'pink';

// Background colors for dots, badges, icons
export const departmentBgColors: Record<string, string> = {
  // By department ID
  '1': 'bg-brand-blue',    // Vânzări
  '2': 'bg-brand-teal',    // Producție
  '3': 'bg-brand-pink',    // Marketing
  '4': 'bg-brand-purple',  // Financiar
  '5': 'bg-brand-green',   // Management
  '6': 'bg-brand-orange',  // DTP
  // By color name
  'blue': 'bg-brand-blue',
  'teal': 'bg-brand-teal',
  'orange': 'bg-brand-orange',
  'green': 'bg-brand-green',
  'purple': 'bg-brand-purple',
  'pink': 'bg-brand-pink',
};

// Border-left colors for cards, task items
export const departmentBorderColors: Record<string, string> = {
  // By department ID
  '1': 'border-l-brand-blue',
  '2': 'border-l-brand-teal',
  '3': 'border-l-brand-pink',
  '4': 'border-l-brand-purple',
  '5': 'border-l-brand-green',
  '6': 'border-l-brand-orange',
  // By color name
  'blue': 'border-l-brand-blue',
  'teal': 'border-l-brand-teal',
  'orange': 'border-l-brand-orange',
  'green': 'border-l-brand-green',
  'purple': 'border-l-brand-purple',
  'pink': 'border-l-brand-pink',
};

// Icon container colors (bg with text)
export const departmentIconColors: Record<string, string> = {
  // By color name
  'blue': 'bg-brand-blue/10 text-brand-blue',
  'teal': 'bg-brand-teal/10 text-brand-teal',
  'orange': 'bg-brand-orange/10 text-brand-orange',
  'green': 'bg-brand-green/10 text-brand-green',
  'purple': 'bg-brand-purple/10 text-brand-purple',
  'pink': 'bg-brand-pink/10 text-brand-pink',
};

// Department order for display (by ID)
export const departmentOrder = ['5', '1', '6', '2', '3', '4'];

// Brand colors order for footer dots
export const brandColorOrder: DepartmentColorName[] = ['green', 'blue', 'orange', 'teal', 'pink', 'purple'];
