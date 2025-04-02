-- Disable RLS for employees table
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;

-- Disable RLS for payroll_records table
ALTER TABLE payroll_records DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Employees are viewable by authenticated users" ON employees;
DROP POLICY IF EXISTS "Employees can be inserted by admin users" ON employees;
DROP POLICY IF EXISTS "Employees can be updated by admin users" ON employees;
DROP POLICY IF EXISTS "Employees can be deleted by admin users" ON employees;

DROP POLICY IF EXISTS "Payroll records are viewable by authenticated users" ON payroll_records;
DROP POLICY IF EXISTS "Payroll records can be inserted by admin users" ON payroll_records;
DROP POLICY IF EXISTS "Payroll records can be updated by admin users" ON payroll_records;
DROP POLICY IF EXISTS "Payroll records can be deleted by admin users" ON payroll_records; 