import { noindexMetadata } from '@/lib/site';

/* A live board: useful to players, not to search results. */
export const metadata = noindexMetadata('Today\'s puzzle');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
