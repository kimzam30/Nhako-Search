import { noindexMetadata } from '@/lib/site';

/* Personal progress pages are not indexed. */
export const metadata = noindexMetadata('Settings');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
