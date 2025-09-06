const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

let supabase = null;

async function initializeSupabase() {
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    logger.info('✅ Supabase initialized successfully');
    return supabase;
  } catch (error) {
    logger.error('❌ Failed to initialize Supabase:', error);
    throw error;
  }
}

module.exports = {
  initializeSupabase,
  getSupabase: () => supabase
};
