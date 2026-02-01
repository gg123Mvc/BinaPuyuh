-- Gender-Based Population Tracking Migration
-- Adds jumlah_jantan and jumlah_betina fields to kandang table
-- Auto-calculates total with database trigger

-- Step 1: Add gender columns to kandang table
ALTER TABLE kandang 
ADD COLUMN IF NOT EXISTS jumlah_jantan INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jumlah_betina INTEGER DEFAULT 0;

-- Step 2: Add constraints for data integrity
ALTER TABLE kandang 
DROP CONSTRAINT IF EXISTS check_jantan_positive,
DROP CONSTRAINT IF EXISTS check_betina_positive;

ALTER TABLE kandang 
ADD CONSTRAINT check_jantan_positive CHECK (jumlah_jantan >= 0),
ADD CONSTRAINT check_betina_positive CHECK (jumlah_betina >= 0);

-- Step 3: Migrate existing data (Option 1: All as betina)
UPDATE kandang 
SET jumlah_betina = COALESCE(jumlah_puyuh, 0), 
    jumlah_jantan = 0 
WHERE jumlah_betina IS NULL OR jumlah_betina = 0;

-- Step 4: Create trigger function for auto-calculating total
CREATE OR REPLACE FUNCTION update_total_puyuh()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically calculate total from jantan + betina
    NEW.jumlah_puyuh := COALESCE(NEW.jumlah_jantan, 0) + COALESCE(NEW.jumlah_betina, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger that runs before INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_update_total_puyuh ON kandang;
CREATE TRIGGER trigger_update_total_puyuh
BEFORE INSERT OR UPDATE ON kandang
FOR EACH ROW
EXECUTE FUNCTION update_total_puyuh();

-- Step 6: Update riwayat_populasi table for gender tracking
ALTER TABLE riwayat_populasi
ADD COLUMN IF NOT EXISTS jumlah_jantan INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jumlah_betina INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jenis_kelamin TEXT DEFAULT 'campuran';

-- Add check constraint for jenis_kelamin
ALTER TABLE riwayat_populasi
DROP CONSTRAINT IF EXISTS check_jenis_kelamin;

ALTER TABLE riwayat_populasi
ADD CONSTRAINT check_jenis_kelamin CHECK (jenis_kelamin IN ('jantan', 'betina', 'campuran'));

-- Step 7: Verification queries
SELECT 
    'kandang columns' as table_name,
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'kandang' 
    AND column_name IN ('jumlah_jantan', 'jumlah_betina', 'jumlah_puyuh')
ORDER BY ordinal_position;

SELECT 
    'riwayat_populasi columns' as table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'riwayat_populasi' 
    AND column_name IN ('jumlah_jantan', 'jumlah_betina', 'jenis_kelamin')
ORDER BY ordinal_position;

-- Test the trigger
DO $$
DECLARE
    test_id BIGINT;
BEGIN
    -- Insert a test kandang
    INSERT INTO kandang (nama_kandang, kapasitas, jumlah_jantan, jumlah_betina)
    VALUES ('TEST_GENDER', 100, 20, 80)
    RETURNING id INTO test_id;
    
    -- Verify total is auto-calculated
    RAISE NOTICE 'Test kandang created with ID: %', test_id;
    
    -- Check if total was calculated correctly
    PERFORM * FROM kandang WHERE id = test_id AND jumlah_puyuh = 100;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Trigger working! Total auto-calculated correctly (20 + 80 = 100)';
    ELSE
        RAISE WARNING '⚠️ Trigger may not be working correctly';
    END IF;
    
    -- Clean up test data
    DELETE FROM kandang WHERE id = test_id;
    RAISE NOTICE 'Test data cleaned up';
END $$;

-- Add helpful comments to columns
COMMENT ON COLUMN kandang.jumlah_jantan IS 'Number of male quails (pejantan)';
COMMENT ON COLUMN kandang.jumlah_betina IS 'Number of female quails (indukan)';
COMMENT ON COLUMN kandang.jumlah_puyuh IS 'Total quails (auto-calculated: jantan + betina)';
COMMENT ON COLUMN riwayat_populasi.jenis_kelamin IS 'Gender affected by population change: jantan, betina, or campuran';

-- Final summary
SELECT 
    nama_kandang,
    jumlah_jantan as jantan,
    jumlah_betina as betina,
    jumlah_puyuh as total,
    CASE 
        WHEN jumlah_jantan > 0 AND jumlah_betina > 0 
        THEN CONCAT('1:', ROUND(jumlah_betina::numeric / jumlah_jantan, 1))
        WHEN jumlah_jantan = 0 THEN 'Semua betina'
        WHEN jumlah_betina = 0 THEN 'Semua jantan'
        ELSE '-'
    END as rasio
FROM kandang
ORDER BY nama_kandang
LIMIT 10;
