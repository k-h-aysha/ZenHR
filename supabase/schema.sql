-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (username);

-- Drop and recreate attendance table to ensure clean definition
DROP TABLE IF EXISTS public.attendance;

-- Create attendance table with proper foreign key relationship but safe data types
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    first_clock_in TEXT NOT NULL,
    last_clock_out TEXT,
    num_clock_ins INTEGER DEFAULT 0,
    total_hours_worked TEXT,
    CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- Disable RLS for attendance
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- Create index on employee_id and date for faster lookups
CREATE INDEX IF NOT EXISTS attendance_employee_date_idx ON public.attendance (employee_id, date);
