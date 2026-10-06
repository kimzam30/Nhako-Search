import { noindexMetadata } from '@/lib/site';

/* Personal progress pages are not indexed. */
export const metadata = noindexMetadata('Butterfly album');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
