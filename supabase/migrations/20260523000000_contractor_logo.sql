-- Add logo_url column to contractors table
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for contractor logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-logos', 'contractor-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own contractor folder
CREATE POLICY "Contractors can upload their own logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contractor-logos');

-- Allow public read of logos
CREATE POLICY "Public can read contractor logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contractor-logos');

-- Allow authenticated users to update/delete their own logo
CREATE POLICY "Contractors can update their own logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contractor-logos');

CREATE POLICY "Contractors can delete their own logo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contractor-logos');
