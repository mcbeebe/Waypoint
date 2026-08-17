import { Platform } from 'react-native';

// URL polyfill only needed on native (browsers have native URL support)
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/dist/polyfill');
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, auth links from email (password recovery, invites, confirmations)
    // land with tokens in the URL that the client must exchange for a session.
    detectSessionInUrl: Platform.OS === 'web',
  },
});
