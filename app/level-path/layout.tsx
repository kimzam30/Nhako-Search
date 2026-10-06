import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Word Search Levels',
  description:
    'Play 360 word search levels across twelve cozy chapters, from Garden to Night Sky. Earn up to three stars on each and unlock the next.',
  path: '/level-path',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
