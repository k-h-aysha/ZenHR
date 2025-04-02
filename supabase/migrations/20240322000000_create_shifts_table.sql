-- Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('First Shift', 'Second Shift', 'Split Shift')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS shifts_user_id_idx ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS shifts_date_idx ON public.shifts(date);

-- Add RLS policies
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all shifts
CREATE POLICY "Admins can view all shifts" ON public.shifts
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- Policy for users to view their own shifts
CREATE POLICY "Users can view their own shifts" ON public.shifts
    FOR SELECT
    USING (
        auth.uid() = user_id
    );

-- Policy for admins to insert shifts
CREATE POLICY "Admins can insert shifts" ON public.shifts
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- Policy for admins to update shifts
CREATE POLICY "Admins can update shifts" ON public.shifts
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- Policy for admins to delete shifts
CREATE POLICY "Admins can delete shifts" ON public.shifts
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    ); 