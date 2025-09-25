-- Add balance column to users table for static deposit system
-- This gives each user 100 SOL to start with

-- Add balance column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(20, 9) DEFAULT 100.0;

-- Update existing users to have 100 SOL balance if they don't have one
UPDATE users SET balance = 100.0 WHERE balance IS NULL OR balance = 0;

-- Create a function to ensure new users get 100 SOL by default
CREATE OR REPLACE FUNCTION ensure_user_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance IS NULL THEN
        NEW.balance = 100.0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure new users get balance
DROP TRIGGER IF EXISTS trigger_ensure_user_balance ON users;
CREATE TRIGGER trigger_ensure_user_balance
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_balance();

-- Add index for balance queries
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;