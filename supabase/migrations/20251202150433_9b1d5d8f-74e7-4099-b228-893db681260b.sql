-- 1. Creez tabela pentru angajații autorizați
CREATE TABLE public.authorized_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  role app_role NOT NULL,
  departments text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.authorized_employees ENABLE ROW LEVEL SECURITY;

-- Policy: doar adminii pot vedea/modifica lista
CREATE POLICY "Admins can manage authorized employees"
ON public.authorized_employees
FOR ALL
USING (has_role(auth.uid(), 'administrator'));

-- Policy: oricine autentificat poate verifica dacă email-ul său e autorizat
CREATE POLICY "Users can check their own authorization"
ON public.authorized_employees
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 2. Inserez angajații predefiniti
INSERT INTO public.authorized_employees (email, name, phone, role, departments) VALUES
  ('ciprian@4culori.ro', 'Ciprian Buduru', '0723.293.740', 'administrator', '{}'),
  ('nicol@4culori.ro', 'Nicoleta Buduru', '0723.567.740', 'director', '{}'),
  ('gabi@4culori.ro', 'Gabi Dinescu', '0784.771.919', 'sef_productie', '{}'),
  ('alex@4culori.ro', 'Alex Ciuraru', '0756609745', 'operator', ARRAY['Print 3D', 'Gravura', 'DTF-UV', 'Broderie']);

-- 3. Creez funcția pentru asignarea automată a rolului (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _authorized authorized_employees%ROWTYPE;
BEGIN
  -- Caut email-ul în angajații autorizați
  SELECT * INTO _authorized
  FROM public.authorized_employees
  WHERE email = NEW.email;
  
  -- Dacă există, inserez rolul
  IF FOUND THEN
    INSERT INTO public.user_roles (user_id, role, departments)
    VALUES (NEW.id, _authorized.role, _authorized.departments)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Creez trigger-ul care se execută după inserarea unui profil nou
CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- 5. Fix imediat: inserez rolul pentru Ciprian Buduru (contul existent)
INSERT INTO public.user_roles (user_id, role, departments)
SELECT p.id, 'administrator'::app_role, '{}'::text[]
FROM public.profiles p
WHERE p.email = 'ciprian@4culori.ro'
ON CONFLICT DO NOTHING;