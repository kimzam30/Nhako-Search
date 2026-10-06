import type { Metadata } from 'next';
import { getLevelMeta } from '@/lib/levels/data';
import { noindexMetadata } from '@/lib/site';

/* 360 individual boards: thin pages for a search index, so only the map is
   indexed. The tab still gets a real name. */
export async function generateMetadata({ params }: { params: Promise<{ levelId: string }> }): Promise<Metadata> {
  const meta = getLevelMeta((await params).levelId);
  return noindexMetadata(meta ? `${meta.chapter} Level ${meta.numberInChapter}` : 'Level');
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
