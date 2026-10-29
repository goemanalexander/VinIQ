const AUTH_URL = 'https://ep-lively-violet-bairtio6.neonauth.c-8.eu-central-1.aws.neon.tech/viniq/auth';

async function authRequest(path: string, body?: unknown) {
  const response = await fetch(AUTH_URL + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error?.message || 'Aanmelding mislukt');
  return result;
}

export type SignedInUser = { id: string; email: string; name?: string };

export async function currentUser(): Promise<SignedInUser | null> {
  const result = await authRequest('/get-session');
  return result?.user?.id ? result.user as SignedInUser : null;
}
export async function signIn(email: string, password: string): Promise<void> {
  await authRequest('/sign-in/email', { email, password });
}
export async function signUp(name: string, email: string, password: string): Promise<void> {
  await authRequest('/sign-up/email', { name, email, password });
}
export async function signOut(): Promise<void> {
  await authRequest('/sign-out', {});
}
export async function getCloudJWT(): Promise<string> {
  const result = await authRequest('/token');
  if (typeof result.token !== 'string' || result.token.split('.').length !== 3) throw new Error('Geen cloudtoken ontvangen');
  return result.token;
}
