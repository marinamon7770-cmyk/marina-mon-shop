
-- Create private schema not exposed by the Data API
CREATE SCHEMA IF NOT EXISTS private;

-- Recreate has_role inside private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- Recreate all policies to reference private.has_role
-- public.categories
DROP POLICY IF EXISTS "admin write categories" ON public.categories;
CREATE POLICY "admin write categories" ON public.categories FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.products
DROP POLICY IF EXISTS "public read published" ON public.products;
CREATE POLICY "public read published" ON public.products FOR SELECT
  USING (is_published OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin write products" ON public.products;
CREATE POLICY "admin write products" ON public.products FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.product_images
DROP POLICY IF EXISTS "admin write images" ON public.product_images;
CREATE POLICY "admin write images" ON public.product_images FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.orders
DROP POLICY IF EXISTS "admin read orders" ON public.orders;
CREATE POLICY "admin read orders" ON public.orders FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin update orders" ON public.orders;
CREATE POLICY "admin update orders" ON public.orders FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin delete orders" ON public.orders;
CREATE POLICY "admin delete orders" ON public.orders FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.order_items
DROP POLICY IF EXISTS "admin read items" ON public.order_items;
CREATE POLICY "admin read items" ON public.order_items FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.questions
DROP POLICY IF EXISTS "admin read questions" ON public.questions;
CREATE POLICY "admin read questions" ON public.questions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin update questions" ON public.questions;
CREATE POLICY "admin update questions" ON public.questions FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin delete questions" ON public.questions;
CREATE POLICY "admin delete questions" ON public.questions FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.site_settings
DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
CREATE POLICY "Admins can insert site settings" ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings" ON public.site_settings FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;
CREATE POLICY "Admins can delete site settings" ON public.site_settings FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.user_roles
DROP POLICY IF EXISTS "admins manage roles insert" ON public.user_roles;
CREATE POLICY "admins manage roles insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admins manage roles update" ON public.user_roles;
CREATE POLICY "admins manage roles update" ON public.user_roles FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admins manage roles delete" ON public.user_roles;
CREATE POLICY "admins manage roles delete" ON public.user_roles FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND private.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop the public version now that nothing references it
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
