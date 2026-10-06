import { noindexMetadata } from '@/lib/site';

/* Individual boards are not indexed; the theme picker is. */
export const metadata = noindexMetadata('Free play');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
