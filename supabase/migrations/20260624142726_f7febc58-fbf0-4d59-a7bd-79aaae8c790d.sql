
-- 1. user_roles: restrict writes to admins
CREATE POLICY "admins manage roles insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage roles update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins manage roles delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. orders: drop duplicate + permissive policies, add basic validation
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "anyone can create order" ON public.orders;

CREATE POLICY "create order with valid data" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(customer_name)) > 0
    AND length(trim(phone)) > 0
    AND total >= 0
    AND status = 'new'
  );

-- 3. order_items: drop duplicate + permissive policies, require recent order
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "anyone can insert items" ON public.order_items;

CREATE POLICY "create items for recent order" ON public.order_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    quantity > 0
    AND price >= 0
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.created_at > now() - interval '10 minutes'
    )
  );

-- 4. Revoke public execute on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.grant_owner_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
-- has_role still needed by RLS evaluation (runs as table owner), keep for authenticated minimal? Revoke all external callers:
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
