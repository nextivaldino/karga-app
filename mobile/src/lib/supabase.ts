import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY têm de estar definidos em .env.local');
}

// Só a Publishable Key — restringida por RLS. A Service Role Key nunca deve
// existir neste projeto (é exclusiva do processo principal do Desktop).
export const supabase = createClient(url, publishableKey);
