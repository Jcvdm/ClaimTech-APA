-- Add RLS policies to allow authenticated users to insert and update records

-- Vehicles table policies
CREATE POLICY "Allow authenticated insert access" 
ON vehicles 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" 
ON vehicles 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow authenticated insert access" ON vehicles IS 'Allows authenticated users to insert new vehicle records';

-- Claims table policies
CREATE POLICY "Allow authenticated insert access" 
ON claims 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" 
ON claims 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow authenticated insert access" ON claims IS 'Allows authenticated users to insert new claim records';
