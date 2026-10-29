import { test, expect, type BrowserContext } from '@playwright/test';

test('two independent browser sessions exchange cellar edits through cloud snapshots', async ({ browser }) => {
  type Remote = { owner_id: string; payload: Record<string, unknown[]>; revision: number; updated_at: string };
  let remote: Remote | null = null;
  let uploads = 0;
  async function mockCloud(context: BrowserContext) {
    await context.route('**/api/auth/get-session', route =>
      route.fulfill({ json: { user: { id: 'test-user', email: 'test@example.com' } } }));
    await context.route('**/api/cellar', async route => {
      const method = route.request().method();
      if (method === 'GET') return route.fulfill({ json: remote });
      const body = route.request().postDataJSON() as { payload: Record<string, unknown[]>; expectedRevision?: number };
      if (method === 'POST') {
        if (remote) return route.fulfill({ status: 409, json: null });
        remote = { owner_id: 'test-user', payload: body.payload, revision: 1, updated_at: new Date().toISOString() };
        uploads++;
        return route.fulfill({ status: 201, json: remote });
      }
      if (method === 'PATCH') {
        if (!remote || body.expectedRevision !== remote.revision) return route.fulfill({ status: 409, json: null });
        remote = { owner_id: 'test-user', payload: body.payload, revision: remote.revision + 1, updated_at: new Date().toISOString() };
        uploads++;
        return route.fulfill({ json: remote });
      }
      return route.fulfill({ status: 405 });
    });
  }
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    await mockCloud(first);
    await mockCloud(second);
    const a = await first.newPage();
    const b = await second.newPage();
    await a.goto('/kelder');
    await expect.poll(() => remote?.revision ?? 0).toBe(1);
    await a.goto('/kelder/wijn/seed-wine-bennati');
    await a.getByPlaceholder('Aankoopprijs per fles (€)').fill('11,50');
    await a.getByRole('button', { name: '+ Fles toevoegen' }).click();
    await expect.poll(() => remote?.revision ?? 0).toBe(2);
    await b.goto('/kelder');
    await expect.poll(async () => b.evaluate(() => JSON.parse(localStorage.getItem('viniq-cellar-v1') || '{}').bottles?.length)).toBe(34);
    expect(uploads).toBe(2);
  } finally {
    await first.close();
    await second.close();
  }
});

test('cloud write conflict is shown and cannot silently overwrite remote data', async ({ page }) => {
  const seed = await page.goto('/kelder');
  expect(seed?.ok()).toBeTruthy();
  const local = await page.evaluate(() => {
    localStorage.removeItem('viniq-cloud-seed');
    localStorage.setItem('viniq-cloud-dirty', '1');
    return JSON.parse(localStorage.getItem('viniq-cellar-v1') || '{}');
  });
  await page.route('**/api/auth/get-session', route =>
    route.fulfill({ json: { user: { id: 'another-user', email: 'another@example.com' } } }));
  await page.route('**/api/cellar', route =>
    route.fulfill({ json: { owner_id: 'another-user', payload: { ...local, bottles: [] }, revision: 5, updated_at: new Date().toISOString() } }));
  await page.reload();
  await expect(page.getByText('Kies welke kelder je wilt bewaren')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lokale kelder behouden' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cloudkelder gebruiken' })).toBeVisible();
});

test('unauthenticated cloud API refuses reads and writes', async ({ request }) => {
  const read = await request.get('/api/cellar');
  expect(read.status()).toBe(401);
  const write = await request.post('/api/cellar', { data: { payload: { wines: [], bottles: [], acquisitions: [], valuations: [], events: [] } } });
  expect(write.status()).toBe(401);
});
