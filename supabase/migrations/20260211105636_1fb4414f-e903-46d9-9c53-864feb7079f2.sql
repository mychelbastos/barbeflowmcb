-- Allow public (anonymous) users to read active service packages
CREATE POLICY "Public read active service_packages"
ON public.service_packages
FOR SELECT
USING (active = true);

-- Allow public read on customer_packages (needed for package detection during booking)
CREATE POLICY "Public read customer_packages"
ON public.customer_packages
FOR SELECT
USING (true);