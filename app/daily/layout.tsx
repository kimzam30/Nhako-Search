import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Daily Word Search Puzzle',
  description:
    'One new cozy word search every day, the same board for everyone. Keep your streak going and collect a keepsake butterfly for each day you play.',
  path: '/daily',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
