import { noindexMetadata } from '@/lib/site';

/* Private, short-lived game rooms. */
export const metadata = noindexMetadata('Game room');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
