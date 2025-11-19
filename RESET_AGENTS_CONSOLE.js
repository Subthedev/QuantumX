/**
 * RESET ARENA AGENTS - Browser Console Script
 *
 * Run this in browser console on http://localhost:8080/arena
 * to reset all 3 agents to fresh state
 */

(async () => {
  console.log('🔄 Resetting Arena Agents...\n');

  const agentIds = ['agent-nexus-01', 'agent-quantum-x', 'agent-zeonix'];

  // Import Supabase client
  const { supabase } = await import('/src/integrations/supabase/client.ts');

  for (const agentId of agentIds) {
    console.log(`\n📦 Clearing ${agentId}...`);

    // Delete all positions
    const { error: posError } = await supabase
      .from('mock_trading_positions')
      .delete()
      .eq('user_id', agentId);

    if (posError) {
      console.error(`❌ Error clearing positions:`, posError);
    } else {
      console.log(`✅ Positions cleared`);
    }

    // Delete stats
    const { error: statsError } = await supabase
      .from('mock_trading_stats')
      .delete()
      .eq('user_id', agentId);

    if (statsError) {
      console.error(`❌ Error clearing stats:`, statsError);
    } else {
      console.log(`✅ Stats cleared`);
    }
  }

  console.log('\n\n✅ ALL AGENTS RESET TO FRESH STATE!');
  console.log('🔄 Reload the page to see fresh agents.');
})();
