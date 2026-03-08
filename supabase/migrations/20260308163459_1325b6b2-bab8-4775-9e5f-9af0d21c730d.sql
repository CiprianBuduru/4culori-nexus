-- Drop all development RLS policies from employees
DROP POLICY IF EXISTS "Allow select for development" ON employees;
DROP POLICY IF EXISTS "Allow update for development" ON employees;
DROP POLICY IF EXISTS "Allow insert for development" ON employees;
DROP POLICY IF EXISTS "Allow delete for development" ON employees;

-- Drop all development RLS policies from clients
DROP POLICY IF EXISTS "Allow select for development" ON clients;
DROP POLICY IF EXISTS "Allow update for development" ON clients;
DROP POLICY IF EXISTS "Allow insert for development" ON clients;
DROP POLICY IF EXISTS "Allow delete for development" ON clients;

-- Drop all development RLS policies from orders
DROP POLICY IF EXISTS "Allow select for development" ON orders;
DROP POLICY IF EXISTS "Allow update for development" ON orders;
DROP POLICY IF EXISTS "Allow insert for development" ON orders;
DROP POLICY IF EXISTS "Allow delete for development" ON orders;

-- Drop all development RLS policies from vacations
DROP POLICY IF EXISTS "Allow select for development" ON vacations;
DROP POLICY IF EXISTS "Allow update for development" ON vacations;
DROP POLICY IF EXISTS "Allow insert for development" ON vacations;
DROP POLICY IF EXISTS "Allow delete for development" ON vacations;

-- Drop all development RLS policies from departments
DROP POLICY IF EXISTS "Allow select for development" ON departments;
DROP POLICY IF EXISTS "Allow update for development" ON departments;
DROP POLICY IF EXISTS "Allow insert for development" ON departments;
DROP POLICY IF EXISTS "Allow delete for development" ON departments;

-- Drop all development RLS policies from production_tasks
DROP POLICY IF EXISTS "Allow select for development" ON production_tasks;
DROP POLICY IF EXISTS "Allow update for development" ON production_tasks;
DROP POLICY IF EXISTS "Allow insert for development" ON production_tasks;
DROP POLICY IF EXISTS "Allow delete for development" ON production_tasks;

-- Drop dev policies from materials
DROP POLICY IF EXISTS "Dev select materials" ON materials;
DROP POLICY IF EXISTS "Dev update materials" ON materials;
DROP POLICY IF EXISTS "Dev insert materials" ON materials;
DROP POLICY IF EXISTS "Dev delete materials" ON materials;

-- Drop dev policies from recipes
DROP POLICY IF EXISTS "Dev select recipes" ON recipes;
DROP POLICY IF EXISTS "Dev update recipes" ON recipes;
DROP POLICY IF EXISTS "Dev insert recipes" ON recipes;
DROP POLICY IF EXISTS "Dev delete recipes" ON recipes;

-- Drop dev policies from service_tariffs
DROP POLICY IF EXISTS "Dev select service_tariffs" ON service_tariffs;
DROP POLICY IF EXISTS "Dev update service_tariffs" ON service_tariffs;
DROP POLICY IF EXISTS "Dev insert service_tariffs" ON service_tariffs;
DROP POLICY IF EXISTS "Dev delete service_tariffs" ON service_tariffs;

-- Drop dev policies from order_type_defaults
DROP POLICY IF EXISTS "Allow update for development" ON order_type_defaults;
DROP POLICY IF EXISTS "Allow delete for development" ON order_type_defaults;

-- Drop dev policies from order_products
DROP POLICY IF EXISTS "Allow select for development" ON order_products;
DROP POLICY IF EXISTS "Allow update for development" ON order_products;
DROP POLICY IF EXISTS "Allow insert for development" ON order_products;
DROP POLICY IF EXISTS "Allow delete for development" ON order_products;

-- Drop dev policies from stock_movements
DROP POLICY IF EXISTS "Allow select for development" ON stock_movements;
DROP POLICY IF EXISTS "Allow delete for development" ON stock_movements;
DROP POLICY IF EXISTS "Allow insert for development" ON stock_movements;

-- Fix notifications: replace broken ownership policies with proper user_id checks
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Add missing SELECT policy for order_products
CREATE POLICY "Authenticated users can view order products" ON order_products
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add stock movements management for sef_productie
CREATE POLICY "Sef productie can manage stock movements" ON stock_movements
  FOR ALL USING (has_role(auth.uid(), 'sef_productie'::app_role));