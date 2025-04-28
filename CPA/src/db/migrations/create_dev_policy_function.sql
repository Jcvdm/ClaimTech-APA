-- Create a function to add development policies
CREATE OR REPLACE FUNCTION create_dev_policy_for_vehicles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vehicles' AND policyname = 'Allow development insert access'
  ) THEN
    -- Create a policy for development that allows all users to insert
    EXECUTE 'CREATE POLICY "Allow development insert access" ON vehicles FOR INSERT TO anon WITH CHECK (true)';
    
    -- Also create a policy for updates
    EXECUTE 'CREATE POLICY "Allow development update access" ON vehicles FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    
    -- Create similar policies for claims
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'claims' AND policyname = 'Allow development insert access'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow development insert access" ON claims FOR INSERT TO anon WITH CHECK (true)';
      EXECUTE 'CREATE POLICY "Allow development update access" ON claims FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    END IF;
  END IF;
END;
$$;
