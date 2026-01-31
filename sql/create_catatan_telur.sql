-- ============================================
-- CATATAN TELUR TABLE SETUP
-- ============================================
-- Script untuk membuat tabel pencatatan produksi telur harian
-- Run di Supabase SQL Editor

-- 1. Buat tabel catatan_telur
CREATE TABLE catatan_telur (
  id BIGSERIAL PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  kandang_id BIGINT REFERENCES kandang(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah >= 0),
  kualitas TEXT DEFAULT 'Baik', -- Baik/Retak/Pecah
  catatan TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE catatan_telur ENABLE ROW LEVEL SECURITY;

-- 3. Allow authenticated users full access
CREATE POLICY "Allow authenticated full access" 
ON catatan_telur FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Allow public read access (untuk landing page)
CREATE POLICY "Allow public read access" 
ON catatan_telur FOR SELECT 
TO anon 
USING (true);

-- 5. Create index for performance
CREATE INDEX idx_catatan_telur_tanggal ON catatan_telur(tanggal);
CREATE INDEX idx_catatan_telur_kandang ON catatan_telur(kandang_id);

-- 6. Insert sample data (optional)
-- INSERT INTO catatan_telur (tanggal, kandang_id, jumlah, kualitas, catatan, created_by)
-- VALUES 
--   (CURRENT_DATE, 1, 45, 'Baik', 'Produksi normal', 'admin'),
--   (CURRENT_DATE, 2, 38, 'Baik', 'Produksi normal', 'admin');

-- ============================================
-- SELESAI
-- ============================================
-- Setelah menjalankan script ini:
-- 1. Tabel catatan_telur siap digunakan
-- 2. RLS sudah dikonfigurasi
-- 3. Index untuk performa sudah dibuat
