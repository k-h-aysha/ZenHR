-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_code ON otp_codes(email, code);

-- Add RLS policies
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow inserting OTP codes
CREATE POLICY "Allow inserting OTP codes" ON otp_codes
  FOR INSERT
  WITH CHECK (true);

-- Allow selecting OTP codes
CREATE POLICY "Allow selecting OTP codes" ON otp_codes
  FOR SELECT
  USING (true);

-- Allow deleting OTP codes
CREATE POLICY "Allow deleting OTP codes" ON otp_codes
  FOR DELETE
  USING (true); 