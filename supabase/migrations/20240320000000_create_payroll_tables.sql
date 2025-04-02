-- Add employee fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Create payroll_records table
CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    allowances DECIMAL(10,2) DEFAULT 0 NOT NULL,
    deductions DECIMAL(10,2) DEFAULT 0 NOT NULL,
    net_salary DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
    payment_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, month, year)
);

-- Disable RLS for payroll_records table
ALTER TABLE payroll_records DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payroll_records updated_at
CREATE TRIGGER update_payroll_records_updated_at
    BEFORE UPDATE ON payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payroll_records_user_id ON payroll_records(user_id); 