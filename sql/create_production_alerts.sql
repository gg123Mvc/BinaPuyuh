-- Production Alerts Table
-- Stores warnings when egg production doesn't match expected rates

CREATE TABLE IF NOT EXISTS production_alerts (
  id BIGSERIAL PRIMARY KEY,
  kandang_id BIGINT REFERENCES kandang(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'no_production', 'low_production', 'early_production', 'declining_production'
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  
  -- Metrics
  quail_age_days INTEGER NOT NULL,
  expected_rate DECIMAL(5,2), -- Expected production rate (0.00 to 1.00)
  actual_rate DECIMAL(5,2), -- Actual production rate
  days_affected INTEGER DEFAULT 1, -- How many consecutive days
  
  -- Recommendations
  recommendations TEXT[], -- Array of recommended action IDs
  
  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  acknowledged_by TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_production_alerts_kandang ON production_alerts(kandang_id);
CREATE INDEX IF NOT EXISTS idx_production_alerts_type ON production_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_production_alerts_active ON production_alerts(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_production_alerts_created ON production_alerts(created_at DESC);

-- RLS Policies
ALTER TABLE production_alerts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all alerts
CREATE POLICY "Enable read access for authenticated users" 
ON production_alerts FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert alerts
CREATE POLICY "Enable insert for authenticated users" 
ON production_alerts FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update their acknowledged alerts
CREATE POLICY "Enable update for authenticated users" 
ON production_alerts FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to delete alerts
CREATE POLICY "Enable delete for authenticated users" 
ON production_alerts FOR DELETE 
TO authenticated 
USING (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_production_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS update_production_alerts_timestamp ON production_alerts;
CREATE TRIGGER update_production_alerts_timestamp
    BEFORE UPDATE ON production_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_production_alerts_timestamp();

-- Verification query
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'production_alerts'
ORDER BY ordinal_position;

COMMENT ON TABLE production_alerts IS 'Stores production alerts when egg production deviates from expected rates based on quail age';
COMMENT ON COLUMN production_alerts.alert_type IS 'Type of alert: no_production, low_production, early_production, declining_production';
COMMENT ON COLUMN production_alerts.severity IS 'Alert severity: info, warning, critical';
COMMENT ON COLUMN production_alerts.expected_rate IS 'Expected production rate as decimal (e.g., 0.75 = 75%)';
COMMENT ON COLUMN production_alerts.actual_rate IS 'Actual production rate as decimal';
COMMENT ON COLUMN production_alerts.recommendations IS 'Array of recommended action codes for this alert';
