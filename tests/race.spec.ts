import { test, expect, Browser, Page } from '@playwright/test';

/**
 * Two-client race regression suite (Phase 2).
 *
 * The bug this locks down: the initial join synced, but every state change
 * afterwards failed in BOTH directions, so "Start Race" could never enable and
 * a race could not be started through the UI at all. Root cause was reading
 * broadcast payloads one level too shallow — Supabase delivers
 * { type, event, payload }, not the payload itself.
 */

const CODE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXYZ2346789';

function makeRoomCode(): string {
  let c = '';
  for (let i = 0; i < 6; i++) {
    c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return c;
}

/** Opens a client, names them, and optionally marks them as room leader. */
async function openClient(
  browser: Browser,
  { name, roomCode, leader }: { name: string; roomCode: string; leader: boolean }
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(
    ({ n, code, isLeader }) => {
      localStorage.setItem('nhako_guest_mode', 'true');
      localStorage.setItem('nhako_guest_name', n);
      if (isLeader) sessionStorage.setItem('is_leader_' + code, 'true');
    },
    { n: name, code: roomCode, isLeader: leader }
  );
  await page.goto(`/play/race/${roomCode}`);
  return page;
}

/** The letters currently rendered on a board, in order. */
function readGrid(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-x][data-y]'))
      .map(el => el.textContent)
      .join('')
  );
}

test.describe('Race mode — two clients', () => {
  test('ready-up, difficulty and start all propagate between players', async ({ browser }) => {
    const roomCode = makeRoomCode();
    const leader = await openClient(browser, { name: 'Leader', roomCode, leader: true });
    const guest = await openClient(browser, { name: 'Partner', roomCode, leader: false });

    // Each side sees the other in the lobby.
    await expect(leader.getByText('Partner', { exact: false }).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(guest.getByText('Leader', { exact: false }).first()).toBeVisible({
      timeout: 10000,
    });

    // Leader -> guest: difficulty change must propagate.
    await leader.getByRole('radio', { name: 'hard', exact: true }).click();
    await expect(guest.getByText(/Race\s*·\s*hard/i)).toBeVisible({ timeout: 10000 });

    // Guest -> leader: ready-up must propagate. This is the regression that
    // left "Start Race" permanently disabled.
    await guest.getByRole('button', { name: 'Ready Up' }).click();
    await expect(guest.getByRole('button', { name: 'Ready!' })).toBeVisible();
    await expect(leader.getByText('READY', { exact: true })).toBeVisible({ timeout: 10000 });

    const startBtn = leader.getByRole('button', { name: 'Start Race' });
    await expect(startBtn).toBeEnabled({ timeout: 10000 });

    // Countdown reaches both clients.
    await startBtn.click();
    await expect(leader.getByText(/^(3|2|1|GO!)$/)).toBeVisible({ timeout: 5000 });
    await expect(guest.getByText(/^(3|2|1|GO!)$/)).toBeVisible({ timeout: 5000 });

    // Both land in gameplay.
    // On desktop the partner's read-only board is shown too; wait for our own.
    const ownCell = '[role="grid"][tabindex="0"] [data-x="0"][data-y="0"]';
    await leader.locator(ownCell).waitFor({ state: 'visible', timeout: 15000 });
    await guest.locator(ownCell).waitFor({ state: 'visible', timeout: 15000 });

    // Same seed must mean the same grid — otherwise the two players are
    // racing on different boards.
    expect(await readGrid(guest)).toBe(await readGrid(leader));

    await leader.context().close();
    await guest.context().close();
  });

  test('joining a room nobody hosts reports "no room" instead of hanging', async ({ browser }) => {
    const roomCode = makeRoomCode();
    const guest = await openClient(browser, { name: 'Lost', roomCode, leader: false });

    await expect(guest.getByText(`No room ${roomCode}`)).toBeVisible({ timeout: 15000 });
    await expect(guest.getByRole('button', { name: 'Back to Lobby' })).toBeVisible();

    await guest.context().close();
  });

  test('a guest arriving before the leader is not kicked out', async ({ browser }) => {
    const roomCode = makeRoomCode();

    // Guest first, leader second — the old code bounced the guest on the very
    // first presence sync because no leader was present yet.
    const guest = await openClient(browser, { name: 'Early', roomCode, leader: false });
    await guest.waitForTimeout(1500);
    const leader = await openClient(browser, { name: 'Leader', roomCode, leader: true });

    await expect(guest).toHaveURL(new RegExp(`/play/race/${roomCode}$`));
    await expect(guest.getByText('Leader', { exact: false }).first()).toBeVisible({
      timeout: 10000,
    });

    await leader.context().close();
    await guest.context().close();
  });

  test('leader leaving returns the guest to the lobby', async ({ browser }) => {
    const roomCode = makeRoomCode();
    const leader = await openClient(browser, { name: 'Leader', roomCode, leader: true });
    const guest = await openClient(browser, { name: 'Partner', roomCode, leader: false });

    await expect(guest.getByText('Leader', { exact: false }).first()).toBeVisible({
      timeout: 10000,
    });

    // Close the tab the way a person does, so unload handlers run.
    await leader.close({ runBeforeUnload: true });
    await leader.context().close();

    await guest.waitForURL('**/play/race/lobby', { timeout: 20000 });
    await guest.context().close();
  });
});

test.describe('Room codes', () => {
  test('join button stays disabled until the code is complete', async ({ page }) => {
    await page.goto('/play/race/lobby');
    const input = page.getByLabel('Room code');
    const join = page.getByRole('button', { name: 'Join', exact: true });

    await expect(join).toBeDisabled();
    await input.fill('ACD');
    await expect(join).toBeDisabled();
    await input.fill('ACDEFG');
    await expect(join).toBeEnabled();
  });

  test('the code input rejects ambiguous characters', async ({ page }) => {
    await page.goto('/play/race/lobby');
    const input = page.getByLabel('Room code');
    // O, 0, I, 1, S, 5, B and 8 are excluded so codes survive being read aloud.
    await input.fill('O0I1S5');
    expect(await input.inputValue()).toBe('');
  });
});
