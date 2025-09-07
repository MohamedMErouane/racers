-- Racers.fun Database Schema Setup
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create races table
CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY,
    round_id BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_pot DECIMAL(20, 9) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    winner INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_id TEXT NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    racer_id INTEGER NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    wallet_address TEXT UNIQUE,
    username TEXT,
    email TEXT,
    total_bets DECIMAL(20, 9) DEFAULT 0,
    total_winnings DECIMAL(20, 9) DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create race_results table
CREATE TABLE IF NOT EXISTS race_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    race_id TEXT NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    racer_id INTEGER NOT NULL,
    final_position DECIMAL(10, 2) NOT NULL,
    payout DECIMAL(20, 9) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vault_transactions table for deposits and withdrawals
CREATE TABLE IF NOT EXISTS vault_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw')),
    amount DECIMAL(20, 9) NOT NULL,
    transaction_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_races_status ON races(status);
CREATE INDEX IF NOT EXISTS idx_races_round_id ON races(round_id);
CREATE INDEX IF NOT EXISTS idx_bets_race_id ON bets(race_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_race_id ON chat_messages(race_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(race_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_user_id ON vault_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_type ON vault_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_vault_transactions_created_at ON vault_transactions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_transactions_updated_at BEFORE UPDATE ON vault_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO races (id, round_id, status, started_at, ends_at, total_pot, total_bets) 
VALUES (
    'race_1757112246343',
    EXTRACT(EPOCH FROM NOW())::BIGINT / 12,
    'countdown',
    NOW(),
    NOW() + INTERVAL '12 seconds',
    0,
    0
) ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
