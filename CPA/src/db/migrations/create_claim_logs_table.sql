-- Migration to create the claim_logs table

-- Create the claim_logs table
CREATE TABLE IF NOT EXISTS claim_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  log_type TEXT NOT NULL, -- e.g., 'claim_created', 'appointment_created', 'inspection_completed', etc.
  message TEXT NOT NULL,
  details JSONB, -- For storing additional structured data related to the log
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_logs_claim_id ON claim_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_logs_created_at ON claim_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_claim_logs_log_type ON claim_logs(log_type);

-- Add RLS policies for the claim_logs table
ALTER TABLE claim_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select claim logs
CREATE POLICY "Allow authenticated users to select claim logs"
ON claim_logs
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert claim logs
CREATE POLICY "Allow authenticated users to insert claim logs"
ON claim_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add a comment to explain the purpose of this table
COMMENT ON TABLE claim_logs IS 'Stores activity logs for claims, including status changes, appointments, inspections, etc.';
