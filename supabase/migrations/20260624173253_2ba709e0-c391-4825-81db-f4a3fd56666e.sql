REVOKE EXECUTE ON FUNCTION public.validate_order_item_price() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recompute_order_total() FROM anon, authenticated, public;