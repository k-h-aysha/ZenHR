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
