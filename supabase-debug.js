// Debug Supabase connection from different modules
console.log('🔍 SUPABASE DEBUG ANALYSIS BAŞLIYOR...\n');

// Test 1: Direct Supabase client
console.log('=== TEST 1: Direct createClient ===');
const { createClient } = require('@supabase/supabase-js');

const url = 'https://wqxkdlcfwcuklpbznqbt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeGtkbGNmd2N1a2xwYnpucWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNDk1NTcsImV4cCI6MjA0ODcyNTU1N30.hPBPCa2vNqvL1rW7mWzYfT7SdqZP0TZjP7OwZj2P9-4';

const directClient = createClient(url, key);
console.log('✅ Direct client created:', !!directClient);

// Test 2: Basic connection test
async function testDirectConnection() {
  try {
    console.log('\n=== TEST 2: Direct Connection Test ===');
    
    const { data, error } = await directClient
      .from('firmalar')
      .select('id, firma_adi')
      .limit(3);
    
    if (error) {
      console.log('❌ Direct query error:', error.message);
      console.log('❌ Error details:', error);
    } else {
      console.log('✅ Direct query success!');
      console.log('📊 Records found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📄 Sample record:', data[0]);
      }
    }
  } catch (e) {
    console.log('❌ Direct query exception:', e.message);
  }
}

// Test 3: Check available tables
async function testTableAccess() {
  try {
    console.log('\n=== TEST 3: Table Access Test ===');
    
    const tables = ['firmalar', 'projeler', 'gorevler', 'kullanicilar'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await directClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}:`, error.message);
        } else {
          console.log(`✅ ${table}: ${count || 'accessible'} records`);
        }
      } catch (e) {
        console.log(`❌ ${table}: exception -`, e.message);
      }
    }
  } catch (e) {
    console.log('❌ Table access test failed:', e.message);
  }
}

// Test 4: Environment variables
console.log('\n=== TEST 4: Environment Variables ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');

// Run tests
async function runAllTests() {
  await testDirectConnection();
  await testTableAccess();
  console.log('\n🎯 SUPABASE DEBUG ANALYSIS TAMAMLANDI');
}

runAllTests();
