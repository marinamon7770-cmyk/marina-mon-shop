
-- 1) Validate order_items prices server-side against products table
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  real_price numeric;
BEGIN
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;
  SELECT price INTO real_price FROM public.products WHERE id = NEW.product_id;
  IF real_price IS NULL THEN
    RAISE EXCEPTION 'Unknown product';
  END IF;
  IF NEW.price IS DISTINCT FROM real_price THEN
    NEW.price := real_price;
  END IF;
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_item_price ON public.order_items;
CREATE TRIGGER trg_validate_order_item_price
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_order_item_price();

REVOKE EXECUTE ON FUNCTION public.validate_order_item_price() FROM anon, authenticated, public;

-- 2) Recompute order total from order_items after insert so client-supplied total can't lie
CREATE OR REPLACE FUNCTION public.recompute_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET total = COALESCE((
    SELECT SUM(price * quantity) FROM public.order_items WHERE order_id = NEW.order_id
  ), 0)
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_order_total ON public.order_items;
CREATE TRIGGER trg_recompute_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_order_total();

REVOKE EXECUTE ON FUNCTION public.recompute_order_total() FROM anon, authenticated, public;

-- 3) Questions table: length/format constraints + tighter RLS insert policy
ALTER TABLE public.questions
  ADD CONSTRAINT questions_name_len  CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  ADD CONSTRAINT questions_msg_len   CHECK (char_length(trim(message)) BETWEEN 1 AND 5000),
  ADD CONSTRAINT questions_email_fmt CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT questions_phone_len CHECK (phone IS NULL OR char_length(phone) BETWEEN 3 AND 40),
  ADD CONSTRAINT questions_slug_len  CHECK (product_slug IS NULL OR char_length(product_slug) <= 200);

DROP POLICY IF EXISTS "anyone can ask" ON public.questions;
CREATE POLICY "anyone can ask"
ON public.questions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(name)) BETWEEN 1 AND 200
  AND char_length(trim(message)) BETWEEN 1 AND 5000
  AND status = 'new'
);
