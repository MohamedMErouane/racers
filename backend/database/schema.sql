-- Racers.fun Database Schema
-- This file contains all the SQL commands to create the database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create races table
CREATE TABLE IF NOT EXISTS races (
    id VARCHAR(255) PRIMARY KEY,
    round_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_pot DECIMAL(20, 8) DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    winner INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for races table
CREATE INDEX IF NOT EXISTS idx_races_status ON races(status);
CREATE INDEX IF NOT EXISTS idx_races_round_id ON races(round_id);
CREATE INDEX IF NOT EXISTS idx_races_created_at ON races(created_at);
CREATE INDEX IF NOT EXISTS idx_races_started_at ON races(started_at);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    username VARCHAR(100) UNIQUE,
    wallet_address VARCHAR(255),
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_won DECIMAL(20, 8) DEFAULT 0,
    total_lost DECIMAL(20, 8) DEFAULT 0,
    profit DECIMAL(20, 8) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_profit ON users(profit DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
    id VARCHAR(255) PRIMARY KEY,
    race_id VARCHAR(255) NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    racer_id INTEGER NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payout DECIMAL(20, 8),
    profit DECIMAL(20, 8),
    tx_signature VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for bets table
CREATE INDEX IF NOT EXISTS idx_bets_race_id ON bets(race_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_racer_id ON bets(racer_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(255) PRIMARY KEY,
    race_id VARCHAR(255) NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat_messages table
CREATE INDEX IF NOT EXISTS idx_chat_messages_race_id ON chat_messages(race_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Create race_results table
CREATE TABLE IF NOT EXISTS race_results (
    id SERIAL PRIMARY KEY,
    race_id VARCHAR(255) NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    winner INTEGER NOT NULL,
    total_pot DECIMAL(20, 8) NOT NULL,
    house_edge DECIMAL(20, 8) NOT NULL,
    winner_pool DECIMAL(20, 8) NOT NULL,
    rakeback_pool DECIMAL(20, 8) NOT NULL,
    payouts JSONB,
    rakebacks JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for race_results table
CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(race_id);
CREATE INDEX IF NOT EXISTS idx_race_results_winner ON race_results(winner);
CREATE INDEX IF NOT EXISTS idx_race_results_created_at ON race_results(created_at);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at BEFORE UPDATE ON bets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate user statistics
CREATE OR REPLACE FUNCTION calculate_user_stats(user_id_param VARCHAR(255))
RETURNS TABLE (
    total_bets BIGINT,
    total_wagered DECIMAL(20, 8),
    total_won DECIMAL(20, 8),
    total_lost DECIMAL(20, 8),
    profit DECIMAL(20, 8),
    win_rate DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bets,
        COALESCE(SUM(b.amount), 0) as total_wagered,
        COALESCE(SUM(CASE WHEN b.payout IS NOT NULL THEN b.payout ELSE 0 END), 0) as total_won,
        COALESCE(SUM(CASE WHEN b.payout IS NULL THEN b.amount ELSE 0 END), 0) as total_lost,
        COALESCE(SUM(CASE WHEN b.payout IS NOT NULL THEN b.payout - b.amount ELSE -b.amount END), 0) as profit,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN b.payout IS NOT NULL THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0 
        END as win_rate
    FROM bets b
    WHERE b.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get race statistics
CREATE OR REPLACE FUNCTION get_race_stats(race_id_param VARCHAR(255))
RETURNS TABLE (
    total_bets BIGINT,
    total_volume DECIMAL(20, 8),
    racer_distribution JSONB,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bets,
        COALESCE(SUM(b.amount), 0) as total_volume,
        jsonb_object_agg(
            b.racer_id::TEXT, 
            racer_stats.amount
        ) as racer_distribution,
        COUNT(DISTINCT b.user_id) as unique_users
    FROM bets b
    LEFT JOIN (
        SELECT 
            racer_id,
            SUM(amount) as amount
        FROM bets 
        WHERE race_id = race_id_param
        GROUP BY racer_id
    ) racer_stats ON b.racer_id = racer_stats.racer_id
    WHERE b.race_id = race_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Delete old completed races (older than 30 days)
    DELETE FROM races 
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old chat messages (older than 7 days)
    DELETE FROM chat_messages 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Delete expired sessions
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    -- Delete old audit logs (older than 90 days)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create view for leaderboard
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    u.id,
    u.username,
    u.wallet_address,
    u.total_wagered,
    u.total_won,
    u.total_lost,
    u.profit,
    u.win_rate,
    u.created_at,
    ROW_NUMBER() OVER (ORDER BY u.profit DESC) as rank
FROM users u
WHERE u.total_wagered > 0
ORDER BY u.profit DESC;

-- Create view for race summary
CREATE OR REPLACE VIEW race_summary AS
SELECT 
    r.id,
    r.round_id,
    r.status,
    r.started_at,
    r.ends_at,
    r.total_pot,
    r.total_bets,
    r.winner,
    rr.house_edge,
    rr.winner_pool,
    rr.rakeback_pool,
    COUNT(DISTINCT b.user_id) as unique_bettors,
    COUNT(DISTINCT cm.user_id) as unique_chatters
FROM races r
LEFT JOIN race_results rr ON r.id = rr.race_id
LEFT JOIN bets b ON r.id = b.race_id
LEFT JOIN chat_messages cm ON r.id = cm.race_id
GROUP BY r.id, r.round_id, r.status, r.started_at, r.ends_at, r.total_pot, r.total_bets, r.winner, rr.house_edge, rr.winner_pool, rr.rakeback_pool
ORDER BY r.created_at DESC;

-- Insert default racers data (if not exists)
INSERT INTO races (id, round_id, status, started_at, ends_at) 
SELECT 'default_race', 0, 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM races LIMIT 1);

-- Create RLS (Row Level Security) policies if needed
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Create a function to initialize the database
CREATE OR REPLACE FUNCTION initialize_database()
RETURNS VOID AS $$
BEGIN
    -- This function can be called to initialize the database
    -- It will create all tables, indexes, functions, and views
    RAISE NOTICE 'Database initialized successfully';
END;
$$ LANGUAGE plpgsql;

-- Call the initialization function
SELECT initialize_database();
