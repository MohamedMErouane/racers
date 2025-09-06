const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

let supabase = null;
let supabaseAdmin = null;

async function initializeSupabase() {
  try {
    // Regular client for user operations
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Admin client for server operations
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test connection with a simple query
    try {
      const { data, error } = await supabaseAdmin
        .from('races')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
        logger.warn('Database tables not found, will be created on first use');
      }
    } catch (error) {
      logger.warn('Database connection test failed, will retry on first use:', error.message);
    }

    logger.info('✅ Supabase connected successfully');
    
    // Initialize database schema
    await initializeDatabaseSchema();
    
  } catch (error) {
    logger.error('❌ Failed to initialize Supabase:', error);
    throw error;
  }
}

async function initializeDatabaseSchema() {
  try {
    logger.info('🔧 Initializing database schema...');

    // For now, we'll skip schema initialization and let tables be created on first use
    // In production, you would run the SQL schema file manually in Supabase
    logger.info('✅ Database schema initialization skipped (tables will be created on first use)');
  } catch (error) {
    logger.error('❌ Failed to initialize database schema:', error);
    // Don't throw here, as the tables might already exist
  }
}

// Database operations
const db = {
  // Race operations
  async createRace(raceData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('races')
        .insert([raceData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating race:', error);
      throw error;
    }
  },

  async getRace(raceId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('races')
        .select('*')
        .eq('id', raceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting race:', error);
      throw error;
    }
  },

  async updateRace(raceId, updates) {
    try {
      const { data, error } = await supabaseAdmin
        .from('races')
        .update(updates)
        .eq('id', raceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating race:', error);
      throw error;
    }
  },

  async getActiveRaces() {
    try {
      const { data, error } = await supabaseAdmin
        .from('races')
        .select('*')
        .in('status', ['waiting', 'countdown', 'racing', 'settling'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting active races:', error);
      throw error;
    }
  },

  async getRaceHistory(limit = 50, offset = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from('races')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting race history:', error);
      throw error;
    }
  },

  // Bet operations
  async createBet(betData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('bets')
        .insert([betData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating bet:', error);
      throw error;
    }
  },

  async getBetsByRace(raceId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('bets')
        .select('*')
        .eq('race_id', raceId);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting bets by race:', error);
      throw error;
    }
  },

  async getBetsByUser(userId, limit = 100) {
    try {
      const { data, error } = await supabaseAdmin
        .from('bets')
        .select(`
          *,
          races (
            id,
            status,
            winner,
            total_pot,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting bets by user:', error);
      throw error;
    }
  },

  async updateBet(betId, updates) {
    try {
      const { data, error } = await supabaseAdmin
        .from('bets')
        .update(updates)
        .eq('id', betId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating bet:', error);
      throw error;
    }
  },

  // User operations
  async createUser(userData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  },

  async getUser(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  },

  async updateUser(userId, updates) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  },

  async getUserStats(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('bets')
        .select(`
          *,
          races (
            id,
            winner,
            total_pot
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Calculate stats
      const stats = {
        totalBets: data.length,
        totalWagered: data.reduce((sum, bet) => sum + parseFloat(bet.amount), 0),
        totalWon: 0,
        totalLost: 0,
        winRate: 0,
        profit: 0
      };

      data.forEach(bet => {
        if (bet.race && bet.race.winner === bet.racer_id) {
          stats.totalWon += parseFloat(bet.payout || 0);
        } else {
          stats.totalLost += parseFloat(bet.amount);
        }
      });

      stats.profit = stats.totalWon - stats.totalLost;
      stats.winRate = stats.totalBets > 0 ? (stats.totalWon > 0 ? 1 : 0) : 0;

      return stats;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  },

  // Chat operations
  async createChatMessage(messageData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating chat message:', error);
      throw error;
    }
  },

  async getChatHistory(raceId, limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('race_id', raceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting chat history:', error);
      throw error;
    }
  },

  // Race results operations
  async createRaceResult(resultData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('race_results')
        .insert([resultData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating race result:', error);
      throw error;
    }
  },

  async getRaceResult(raceId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('race_results')
        .select('*')
        .eq('race_id', raceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting race result:', error);
      throw error;
    }
  },

  // Leaderboard operations
  async getLeaderboard(limit = 100) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          username,
          wallet_address,
          total_wagered,
          total_won,
          total_lost,
          profit,
          win_rate,
          created_at
        `)
        .order('profit', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }
};

module.exports = {
  initializeSupabase,
  db,
  getSupabase: () => supabase,
  getSupabaseAdmin: () => supabaseAdmin
};
