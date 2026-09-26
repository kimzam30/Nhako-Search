'use client';
import { supabase } from '@/lib/multiplayer/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { usePlayer, patchSummary } from '@/lib/data/player';
import { clearCache } from '@/lib/data/cache';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Sheet, afterSheetClosed } from '@/components/ui/Sheet';
import { MixerPanel } from '@/components/sound/MixerPanel';
import { updateDisplayName } from '@/lib/auth/profile';
import { deleteAllUserData } from '@/lib/auth/deleteData';

type Theme = 'light' | 'dark' | 'system';

/** An iOS-style grouped section: a small caption over a single card. */
function Group({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const id = `group-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="mb-8">
      <h2 id={id} className="px-1 mb-2 text-xs font-extrabold uppercase tracking-widest text-ink-2">
        {title}
      </h2>
      <div className="bg-surface border-2 border-line rounded-[22px] p-5 shadow-[4px_5px_0_0_var(--line)]">{children}</div>
      {footer && <p className="px-1 mt-2 text-sm font-body text-ink-2">{footer}</p>}
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, summary } = usePlayer();
  const [theme, setThemeState] = useState<Theme>('system');
  const profile = summary ? { displayName: summary.name, isGuest: summary.isGuest } : null;
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let stored: Theme = 'system';
    try {
      const t = localStorage.getItem('nhako_theme');
      if (t === 'light' || t === 'dark') stored = t;
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored);
  }, []);
  // The field shows the saved name until the player starts editing it.
  const draft = nameDraft ?? profile?.displayName ?? '';

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('nhako_theme', t);
    } catch {
      /* private mode */
    }
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const saveName = async () => {
    const name = draft.trim().slice(0, 20) || 'Player';
    await patchSummary(s => ({ ...s, name }));
    await updateDisplayName(name);
    setNameDraft(null);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearCache();
    try {
      localStorage.removeItem('nhako_guest_mode');
    } catch {
      /* private mode */
    }
    // A one-way door: Back must not return to a signed-in settings screen.
    router.replace('/sign-in');
  };

  const handleDeleteData = async () => {
    setIsDeleting(true);
    setDeleteError('');
    const result = await deleteAllUserData();
    setIsDeleting(false);
    if (!result.ok) {
      setDeleteError(
        `Could not clear: ${result.failed.join(', ')}. Everything else was deleted and you were signed out — sign in again and retry to finish.`
      );
      return;
    }
    setConfirmDelete(false);
    afterSheetClosed(() => router.replace('/sign-in'));
  };

  const nameChanged = profile && draft.trim() && draft.trim() !== profile.displayName;

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-5 pb-6" style={{ paddingTop: 'max(1.25rem, var(--safe-top))' }}>
      <h1 className="text-4xl font-display text-ink mb-6">Settings</h1>

      <Group title="Appearance">
        {/* A native-style segmented control. Three options fit on any phone,
            so the old sideways-scrolling cards and their pulsing hint went. */}
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 p-1 bg-background border-2 border-line rounded-2xl">
          {(['light', 'dark', 'system'] as Theme[]).map(t => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              onClick={() => setTheme(t)}
              className={`press min-h-[44px] min-w-0 px-1 text-[min(0.875rem,4vw)] leading-tight rounded-xl font-body font-extrabold capitalize transition-colors ${
                theme === t ? 'bg-accent text-on-accent shadow-[0_2px_0_var(--line)]' : 'text-ink-2'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Sound" footer="Every sound is generated live on your device — nothing to download.">
        <MixerPanel />
      </Group>

      <Group title="Account">
        {profile ? (
          <div className="flex flex-col gap-5">
            <form
              className="flex flex-col gap-2"
              onSubmit={e => {
                e.preventDefault();
                if (nameChanged) saveName();
              }}
            >
              <label htmlFor="display-name" className="text-sm font-extrabold text-ink">
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  id="display-name"
                  type="text"
                  value={draft}
                  onChange={e => setNameDraft(e.target.value)}
                  maxLength={20}
                  autoComplete="nickname"
                  enterKeyHint="done"
                  className="flex-1 min-w-0 min-h-[48px] bg-background border-2 border-line rounded-xl px-3 font-bold text-ink text-base outline-none focus:border-accent"
                />
                <Button type="submit" disabled={!nameChanged} className="px-4">
                  Save
                </Button>
              </div>
              <p className="text-sm font-bold text-ink-2" aria-live="polite">
                {nameSaved ? 'Saved.' : user ? user.email : 'Guest · your partner sees this name when you race.'}
              </p>
            </form>

            {profile.isGuest ? (
              <ButtonLink href="/sign-in" fullWidth>
                Sign in with Google
              </ButtonLink>
            ) : (
              <Button onClick={handleSignOut} fullWidth variant="secondary">
                Sign out
              </Button>
            )}
            <Button onClick={() => setConfirmDelete(true)} fullWidth variant="danger">
              Delete my data
            </Button>
          </div>
        ) : (
          <div className="animate-pulse h-32 bg-ink/5 rounded-xl w-full" />
        )}
      </Group>

      <Group title="About">
        <div className="flex flex-col gap-2 text-ink-2 font-body">
          <p>Made by kimzam for date nights and lazy afternoons.</p>
          <p className="text-xs">Version 1.1.0</p>
        </div>
      </Group>

      <Sheet open={confirmDelete} onClose={() => !isDeleting && setConfirmDelete(false)} title="Delete everything?">
        <p className="font-body font-bold text-ink-2 mb-5">
          This erases your levels, streak, butterflies and race history from the server and this device.
          It cannot be undone.
        </p>
        {deleteError && (
          <p className="font-body text-sm text-accent-ink font-bold mb-4" role="alert">
            {deleteError}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={handleDeleteData} fullWidth variant="danger" disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete everything'}
          </Button>
          <Button onClick={() => setConfirmDelete(false)} fullWidth variant="secondary" disabled={isDeleting}>
            Keep my data
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
