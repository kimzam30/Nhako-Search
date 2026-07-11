import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 bg-background gap-4 w-full max-w-sm mx-auto">
      <h1 className="text-4xl font-display text-ink mb-4">NhakoSearch</h1>
      
      <Link href="/daily" className="w-full bg-surface border-2 border-accent text-ink font-body font-bold py-3 px-4 rounded-xl text-center hover:bg-accent hover:border-ink transition-colors shadow-sm active:scale-95 duration-100 min-h-[44px]">
        Daily Challenge
      </Link>

      <Link href="/level-path" className="w-full bg-accent text-ink font-body font-bold py-3 px-4 rounded-xl text-center border-2 border-ink shadow-[0_4px_0_var(--ink)] active:translate-y-1 active:shadow-none min-h-[44px] transition-transform">
        Level Path
      </Link>
      
      <Link href="/play/race/lobby" className="w-full bg-gold/50 text-ink border-2 border-ink font-body font-bold py-3 px-4 rounded-xl text-center hover:bg-gold transition-colors shadow-sm active:scale-95 duration-100 min-h-[44px]">
        Race a Friend
      </Link>
      
      <Link href="/play/standard/easy" className="w-full bg-surface border-2 border-ink/30 text-ink font-body font-bold py-3 px-4 rounded-xl text-center hover:bg-accent-soft transition-colors active:scale-95 duration-100 min-h-[44px]">
        Standard (Free Play)
      </Link>

      <div className="flex gap-4 w-full mt-4">
        <Link href="/profile" className="flex-1 bg-surface border-2 border-ink text-ink font-body font-bold py-3 px-4 rounded-xl text-center hover:bg-accent-soft transition-colors active:scale-95 duration-100">
          Collection
        </Link>
        <Link href="/settings" className="flex-1 bg-surface border-2 border-ink text-ink font-body font-bold py-3 px-4 rounded-xl text-center hover:bg-accent-soft transition-colors active:scale-95 duration-100">
          Settings
        </Link>
      </div>
    </div>
  );
}
