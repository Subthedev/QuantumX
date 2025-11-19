/**
 * CLEAR BROWSER CACHE FOR ARENA
 *
 * Run this in browser console to clear all Arena caches for a fresh start
 * Paste this into console at http://localhost:8080/arena
 */

(function() {
  console.log('🧹 Clearing Arena caches...\n');

  try {
    // Clear localStorage arena cache
    localStorage.removeItem('arena_agents_cache');
    console.log('✅ Cleared localStorage arena_agents_cache');

    // Clear any React Query caches
    if (window.queryClient) {
      window.queryClient.clear();
      console.log('✅ Cleared React Query cache');
    }

    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ Cleared sessionStorage');

    console.log('\n✅ All caches cleared! Refresh the page for fresh data.');
    console.log('💡 The SQL script will clear the database. Run it in Supabase SQL Editor:');
    console.log('   File: CLEAR_STALE_ARENA_DATA.sql');

  } catch (error) {
    console.error('❌ Error clearing caches:', error);
  }
})();
