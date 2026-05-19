CREATE OR REPLACE FUNCTION public.replace_contractor_products(
  p_contractor_id uuid,
  p_products jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Delete products no longer in the list (or all if list is empty)
  IF jsonb_array_length(p_products) = 0 THEN
    DELETE FROM public.products WHERE contractor_id = p_contractor_id;
    RETURN;
  END IF;

  DELETE FROM public.products
  WHERE contractor_id = p_contractor_id
    AND id NOT IN (
      SELECT (p->>'id')::uuid
      FROM jsonb_array_elements(p_products) AS p
    );

  -- Upsert remaining/new products in the same transaction
  INSERT INTO public.products (
    id, contractor_id, name, description, unit,
    base_price, is_featured, display_order
  )
  SELECT
    (p->>'id')::uuid,
    p_contractor_id,
    p->>'name',
    p->>'description',
    p->>'unit',
    (p->>'base_price')::numeric,
    (p->>'is_featured')::boolean,
    (p->>'display_order')::integer
  FROM jsonb_array_elements(p_products) AS p
  ON CONFLICT (id) DO UPDATE SET
    name          = EXCLUDED.name,
    description   = EXCLUDED.description,
    unit          = EXCLUDED.unit,
    base_price    = EXCLUDED.base_price,
    is_featured   = EXCLUDED.is_featured,
    display_order = EXCLUDED.display_order,
    updated_at    = now();
END;
$$;
