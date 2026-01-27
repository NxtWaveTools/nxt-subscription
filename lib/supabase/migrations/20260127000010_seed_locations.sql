-- ============================================================================
-- Seed Locations Data
-- ============================================================================
-- Created: 2026-01-27
-- Description: Initial location data for offices and NIAT centers
-- ============================================================================

INSERT INTO public.locations (name, location_type, address) VALUES
  -- Office locations
  ('Office - Hyd Brigade', 'OFFICE', 'Hyderabad, Brigade Road'),
  ('Office - Hyd KKH', 'OFFICE', 'Hyderabad, KKH'),
  ('Office - Hyd Other', 'OFFICE', 'Hyderabad, Other'),
  
  -- NIAT locations
  ('NIAT - Aurora', 'NIAT', NULL),
  ('NIAT - Yenepoya Mangalore', 'NIAT', 'Mangalore'),
  ('NIAT - CDU', 'NIAT', NULL),
  ('NIAT - Takshasila', 'NIAT', NULL),
  ('NIAT - S-Vyasa', 'NIAT', NULL),
  ('NIAT - BITS - Farah', 'NIAT', 'Farah'),
  ('NIAT - AMET', 'NIAT', NULL),
  ('NIAT - CIET - LAM', 'NIAT', 'LAM'),
  ('NIAT - NIU', 'NIAT', NULL),
  ('NIAT - ADYPU', 'NIAT', NULL),
  ('NIAT - VGU', 'NIAT', NULL),
  ('NIAT - CITY - Mothadaka', 'NIAT', 'Mothadaka'),
  ('NIAT - NSRIT', 'NIAT', NULL),
  ('NIAT - NRI', 'NIAT', NULL),
  ('NIAT - Mallareddy', 'NIAT', NULL),
  ('NIAT - Annamacharya', 'NIAT', NULL),
  ('NIAT - SGU', 'NIAT', NULL),
  ('NIAT - Sharda', 'NIAT', NULL),
  ('NIAT - Crescent', 'NIAT', NULL),
  
  -- Other
  ('Other', 'OTHER', NULL)
ON CONFLICT (name) DO NOTHING;
