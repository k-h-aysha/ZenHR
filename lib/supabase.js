import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mdvfgvwntsrnpykgmzca.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdmZndndudHNybnB5a2dtemNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNDgwOTMsImV4cCI6MjA1NjcyNDA5M30.TDZFYpiNMJ7vTd-cnxShRdziw24zkl5OSc10t-uq9ag';

export const supabase = createClient(supabaseUrl, supabaseKey);
