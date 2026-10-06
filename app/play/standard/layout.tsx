import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Free Play Word Search',
  description:
    'Pick one of twelve themes and easy, medium or hard, and play as many free word search boards as you like. Words never repeat too soon.',
  path: '/play/standard',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
