import { GameClient } from '@/components/game/GameClient';

export default function StandardPlayPage() {
  const words = ['BUTTERFLY', 'GARDEN', 'BLOSSOM', 'SPRING', 'NATURE', 'SUNSET'];
  
  return (
    <div className="flex flex-col flex-1 p-4 bg-background items-center justify-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-lg">
        <h1 className="text-2xl font-display text-ink">Standard Mode</h1>
      </div>
      <GameClient words={words} difficulty="easy" />
    </div>
  );
}
