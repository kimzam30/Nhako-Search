import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Multiplayer Word Search with a Friend',
  description:
    'Play word search online with a friend: race on the same board or solve one together while you chat. Share a room code, no account needed.',
  path: '/play/race/lobby',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
