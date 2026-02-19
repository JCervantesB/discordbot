import { db } from '@/lib/db';
import { scenes, stories } from '@/drizzle/schema';
import { and, asc, eq } from 'drizzle-orm';

type HistoriaPageProps = {
  params: {
    guildId: string;
  };
};

export default async function HistoriaPage({ params }: HistoriaPageProps) {
  const guildIdParam = decodeURIComponent(params.guildId);
  const guildId = 'GLOBAL_STORY';

  const storyRows = await db
    .select()
    .from(stories)
    .where(and(eq(stories.guildId, guildId), eq(stories.status, 'active')))
    .limit(1);

  const story = storyRows[0];

  if (!story) {
    return (
      <main className="min-h-screen bg-black text-gray-100 flex items-center justify-center">
        <div className="max-w-md text-center px-4">
          <h1 className="text-2xl font-semibold mb-4">Historia no encontrada</h1>
          <p className="text-sm text-gray-400">
            Aún no existe una historia activa para este servidor. Crea escenas con el comando
            <span className="font-mono px-1">/generate</span> en Discord para comenzar.
          </p>
        </div>
      </main>
    );
  }

  const sceneRows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.storyId, story.id))
    .orderBy(asc(scenes.sceneNumber));

  return (
    <main className="min-h-screen bg-black text-gray-100 flex justify-center">
      <div className="w-full max-w-3xl px-4 py-6 flex flex-col gap-4">
        <header className="mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">{story.title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Servidor: <span className="font-mono">{guildId}</span> · Escenas: {sceneRows.length}
          </p>
        </header>
        <section className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-gray-900/80 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
            <div className="h-64 bg-black flex items-center justify-center border-b border-gray-800">
              {sceneRows.length > 0 && sceneRows[sceneRows.length - 1].imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sceneRows[sceneRows.length - 1].imageUrl as string}
                  alt={`Escena #${sceneRows[sceneRows.length - 1].sceneNumber}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-500 text-sm">Aún no hay imagen para mostrar</div>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-6">
              {sceneRows.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Todavía no hay escenas en esta historia. Usa el comando
                  <span className="font-mono px-1">/generate</span> en Discord para crear la
                  primera.
                </p>
              ) : (
                sceneRows.map((scene) => (
                  <article key={scene.id} className="space-y-2">
                    <header className="flex items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold">
                        Escena #{scene.sceneNumber}{' '}
                        <span className="text-gray-500 text-xs">
                          · {new Date(scene.createdAt as Date).toLocaleString()}
                        </span>
                      </h2>
                    </header>
                    <p className="text-sm leading-relaxed whitespace-pre-line text-gray-100">
                      {scene.narrative}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
        <footer className="text-[11px] text-gray-500 text-center mt-2">
          Genera nuevas escenas desde Discord con <span className="font-mono">/generate</span>. La
          historia se actualiza automáticamente aquí.
        </footer>
      </div>
    </main>
  );
}
