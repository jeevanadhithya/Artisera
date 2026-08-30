import { getSupabase } from './services/supabase';

const testRpc = async () => {
  const supabase = getSupabase();
  console.log('Testing RPC SQL execution:');
  
  // Try common SQL execution RPC names
  const rpcs = [
    { name: 'exec_sql', params: { query: 'SELECT 1;' } },
    { name: 'exec_sql', params: { sql: 'SELECT 1;' } },
    { name: 'run_sql', params: { sql: 'SELECT 1;' } },
    { name: 'execute_sql', params: { sql: 'SELECT 1;' } }
  ];

  for (const rpc of rpcs) {
    try {
      const { data, error } = await supabase.rpc(rpc.name, rpc.params);
      if (error) {
        console.log(`❌ RPC '${rpc.name}' failed with error:`, error.message);
      } else {
        console.log(`✅ RPC '${rpc.name}' succeeded! Response:`, data);
        return rpc.name;
      }
    } catch (e) {
      console.log(`❌ RPC '${rpc.name}' threw exception:`, e);
    }
  }
  
  console.log('No SQL execution RPC found.');
  return null;
};

testRpc();
