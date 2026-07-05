-- ═══════════════════════════════════════════════════════════
-- Migration: Normalise Chilean TP specialties
-- Date: 2026-04-10
-- Idempotent: safe to re-run; all UPDATEs are WHERE-guarded.
-- ═══════════════════════════════════════════════════════════
--
-- Old values → canonical values
--   "Soldadura TIG"   → "Soldadura"
--   "Automotriz"      → "Mecánica Automotriz"
--   "Refrigeración"   → "Refrigeración y Climatización"
--   "Refrigeracion"   → "Refrigeración y Climatización"
--   "Informática"     → "Programación"
--   "Informatica"     → "Programación"
--   "Mecatronica"     → "Mecatrónica"   (accent fix)
--   "Ebanisteria"     → "Ebanistería"   (accent fix)
-- All other values that already match the canonical list are left untouched.
-- ───────────────────────────────────────────────────────────

-- ─── posts.tag ───────────────────────────────────────────────────────────────
UPDATE posts SET tag = 'Soldadura'
  WHERE tag IN ('Soldadura TIG', 'Soldadura TIG ');

UPDATE posts SET tag = 'Mecánica Automotriz'
  WHERE tag IN ('Automotriz', 'Automotriz ');

UPDATE posts SET tag = 'Refrigeración y Climatización'
  WHERE tag IN ('Refrigeración', 'Refrigeracion', 'Refrigeración y climatización');

UPDATE posts SET tag = 'Programación'
  WHERE tag IN ('Informática', 'Informatica');

UPDATE posts SET tag = 'Mecatrónica'
  WHERE tag IN ('Mecatronica', 'Mecatrónica ');

UPDATE posts SET tag = 'Ebanistería'
  WHERE tag IN ('Ebanisteria', 'Ebanistería ');

-- ─── profiles.specialty ──────────────────────────────────────────────────────
UPDATE profiles SET specialty = 'Soldadura'
  WHERE specialty IN ('Soldadura TIG', 'Soldadura TIG ');

UPDATE profiles SET specialty = 'Mecánica Automotriz'
  WHERE specialty IN ('Automotriz', 'Automotriz ');

UPDATE profiles SET specialty = 'Refrigeración y Climatización'
  WHERE specialty IN ('Refrigeración', 'Refrigeracion', 'Refrigeración y climatización');

UPDATE profiles SET specialty = 'Programación'
  WHERE specialty IN ('Informática', 'Informatica');

UPDATE profiles SET specialty = 'Mecatrónica'
  WHERE specialty IN ('Mecatronica', 'Mecatrónica ');

UPDATE profiles SET specialty = 'Ebanistería'
  WHERE specialty IN ('Ebanisteria', 'Ebanistería ');

-- ─── job_postings.specialty ──────────────────────────────────────────────────
UPDATE job_postings SET specialty = 'Soldadura'
  WHERE specialty IN ('Soldadura TIG', 'Soldadura TIG ');

UPDATE job_postings SET specialty = 'Mecánica Automotriz'
  WHERE specialty IN ('Automotriz', 'Automotriz ');

UPDATE job_postings SET specialty = 'Refrigeración y Climatización'
  WHERE specialty IN ('Refrigeración', 'Refrigeracion', 'Refrigeración y climatización');

UPDATE job_postings SET specialty = 'Programación'
  WHERE specialty IN ('Informática', 'Informatica');

UPDATE job_postings SET specialty = 'Mecatrónica'
  WHERE specialty IN ('Mecatronica', 'Mecatrónica ');

UPDATE job_postings SET specialty = 'Ebanistería'
  WHERE specialty IN ('Ebanisteria', 'Ebanistería ');

-- ─── Reload PostgREST schema cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
