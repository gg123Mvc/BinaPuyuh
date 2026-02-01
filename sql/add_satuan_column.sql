-- Migration Script: Add/Update Satuan (Unit) Column
-- Created: 2026-02-01
-- Purpose: Add unit of measurement field to purchase and feed tables

-- 1. Update pembelian table
-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pembelian' AND column_name = 'satuan'
    ) THEN
        ALTER TABLE pembelian ADD COLUMN satuan TEXT DEFAULT 'pcs';
    END IF;
END $$;

-- Set default and make not null (update existing nulls first)
UPDATE pembelian SET satuan = 'pcs' WHERE satuan IS NULL;
ALTER TABLE pembelian ALTER COLUMN satuan SET DEFAULT 'pcs';
ALTER TABLE pembelian ALTER COLUMN satuan SET NOT NULL;

-- 2. Update pemberian_pakan table
-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pemberian_pakan' AND column_name = 'satuan'
    ) THEN
        ALTER TABLE pemberian_pakan ADD COLUMN satuan TEXT DEFAULT 'kg';
    END IF;
END $$;

-- Set default and make not null (update existing nulls first)
UPDATE pemberian_pakan SET satuan = 'kg' WHERE satuan IS NULL;
ALTER TABLE pemberian_pakan ALTER COLUMN satuan SET DEFAULT 'kg';
ALTER TABLE pemberian_pakan ALTER COLUMN satuan SET NOT NULL;

-- 3. Update riwayat_populasi table
-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'riwayat_populasi' AND column_name = 'satuan'
    ) THEN
        ALTER TABLE riwayat_populasi ADD COLUMN satuan TEXT DEFAULT 'ekor';
    END IF;
END $$;

-- Set default and make not null (update existing nulls first)
UPDATE riwayat_populasi SET satuan = 'ekor' WHERE satuan IS NULL;
ALTER TABLE riwayat_populasi ALTER COLUMN satuan SET DEFAULT 'ekor';
ALTER TABLE riwayat_populasi ALTER COLUMN satuan SET NOT NULL;

-- 4. Verify and show results
SELECT 'pembelian' as table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pembelian' AND column_name = 'satuan'
UNION ALL
SELECT 'pemberian_pakan' as table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'pemberian_pakan' AND column_name = 'satuan'
UNION ALL
SELECT 'riwayat_populasi' as table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'riwayat_populasi' AND column_name = 'satuan';

-- Verify data
SELECT 'pembelian' as table_name, COUNT(*) as total_records, COUNT(satuan) as with_satuan
FROM pembelian
UNION ALL
SELECT 'pemberian_pakan' as table_name, COUNT(*) as total_records, COUNT(satuan) as with_satuan
FROM pemberian_pakan
UNION ALL
SELECT 'riwayat_populasi' as table_name, COUNT(*) as total_records, COUNT(satuan) as with_satuan
FROM riwayat_populasi;
