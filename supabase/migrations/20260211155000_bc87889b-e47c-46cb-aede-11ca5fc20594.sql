
-- Step 1: Add customer_id column (nullable initially)
ALTER TABLE public.recurring_clients 
ADD COLUMN customer_id uuid REFERENCES public.customers(id);

-- Step 2: Link the one that already matches
UPDATE public.recurring_clients rc
SET customer_id = c.id
FROM public.customers c
WHERE c.phone = rc.client_phone AND c.tenant_id = rc.tenant_id;

-- Step 3: Create customers for unmatched recurring clients and link them
WITH new_customers AS (
  INSERT INTO public.customers (name, phone, tenant_id)
  SELECT rc.client_name, rc.client_phone, rc.tenant_id
  FROM public.recurring_clients rc
  WHERE rc.customer_id IS NULL
  RETURNING id, phone, tenant_id
)
UPDATE public.recurring_clients rc
SET customer_id = nc.id
FROM new_customers nc
WHERE rc.client_phone = nc.phone AND rc.tenant_id = nc.tenant_id AND rc.customer_id IS NULL;

-- Step 4: Make customer_id NOT NULL now that all rows have values
ALTER TABLE public.recurring_clients ALTER COLUMN customer_id SET NOT NULL;

-- Step 5: Drop the old columns
ALTER TABLE public.recurring_clients DROP COLUMN client_name;
ALTER TABLE public.recurring_clients DROP COLUMN client_phone;
