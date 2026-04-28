import { supabase } from './supabase-client.js?v=5';

/**
 * Redirect to login if not authenticated.
 * Call as: await guardAuth(); at the top of every protected page module.
 */
export async function guardAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.replace('/login');
    throw new Error('unauthenticated');
  }
  return session;
}

/**
 * Redirect to home if already authenticated (use on login/register pages).
 */
export async function guardPublic() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    location.replace('/home');
  }
}
