import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Replicated Supabase credentials
const supabaseUrl = 'https://jefelvpmblmnnipeplql.supabase.co';
const supabaseAnonKey = 'sb_publishable_QQnONCuVQ1yB1Q_cMgB3uA_Eud9iHzs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable persistence for memory-only testing in this clean environment
    detectSessionInUrl: false,
  },
});
