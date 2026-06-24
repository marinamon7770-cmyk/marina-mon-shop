GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_order_item_price() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_order_total() TO anon, authenticated;