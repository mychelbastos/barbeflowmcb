
-- Add notes/anamnesis field to customers
ALTER TABLE public.customers ADD COLUMN notes text;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.notes IS 'Observações, anamnese ou informações relevantes sobre o cliente';
