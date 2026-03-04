-- Venue photos: store user-submitted photos in Supabase Storage
-- Photos are captured during deal extraction but were not previously persisted

-- venue_photos table
CREATE TABLE IF NOT EXISTS venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image/jpeg',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venue_photos_venue_id ON venue_photos (venue_id);

-- RLS: public read, authenticated write
ALTER TABLE venue_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_photos_public_read" ON venue_photos
  FOR SELECT USING (true);

CREATE POLICY "venue_photos_auth_insert" ON venue_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket for venue photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-photos', 'venue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, authenticated upload
CREATE POLICY "venue_photos_storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'venue-photos');

CREATE POLICY "venue_photos_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'venue-photos' AND auth.role() = 'authenticated');
