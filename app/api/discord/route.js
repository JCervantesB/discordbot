import { verifyKey } from 'discord-interactions';
import { z } from 'zod';
import { db } from '@/lib/db';
import { characters } from '@/drizzle/schema';
import { getOrCreateStory } from '@/lib/stories';
export const runtime = 'edge';
const PersonajeSchema = z.object({
    nombre: z.string().min(1).max(50),
    descripcion: z.string().min(1).max(500)
});
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}
export async function POST(request) {
    const signature = request.headers.get('x-signature-ed25519') || '';
    const timestamp = request.headers.get('x-signature-timestamp') || '';
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey)
        return json({ error: 'Missing public key' }, 500);
    const bodyText = await request.text();
    const isValid = verifyKey(new TextEncoder().encode(bodyText), signature, timestamp, publicKey);
    if (!isValid)
        return json({ error: 'Bad signature' }, 401);
    const payload = JSON.parse(bodyText);
    if (payload.type === 1)
        return json({ type: 1 });
    if (payload.type === 2 && payload.data?.name === 'personaje') {
        const guildId = payload.guild_id;
        const userId = payload.member.user.id;
        const userName = payload.member.user.username;
        const options = Object.fromEntries((payload.data.options || []).map((o) => [o.name, o.value]));
        const parsed = PersonajeSchema.safeParse({
            nombre: options.nombre,
            descripcion: options.descripcion
        });
        if (!parsed.success) {
            return json({
                type: 4,
                data: {
                    content: 'Datos inválidos. Revisa nombre (<=50) y descripción (<=500).'
                }
            });
        }
        const story = await getOrCreateStory(guildId);
        const now = new Date();
        const [character] = await db
            .insert(characters)
            .values({
            storyId: story.id,
            userId,
            userName,
            characterName: parsed.data.nombre,
            description: parsed.data.descripcion,
            traits: {},
            createdAt: now,
            updatedAt: now
        })
            .onConflictDoUpdate({
            target: [characters.storyId, characters.userId],
            set: {
                userName,
                characterName: parsed.data.nombre,
                description: parsed.data.descripcion,
                updatedAt: now
            }
        })
            .returning();
        return json({
            type: 4,
            data: {
                embeds: [
                    {
                        title: '✨ Personaje Registrado',
                        color: 0x5865f2,
                        fields: [
                            { name: 'Nombre', value: character.characterName, inline: true },
                            { name: 'Usuario', value: `@${userName}`, inline: true },
                            { name: 'Descripción', value: character.description }
                        ],
                        footer: { text: 'Usa /generate para comenzar tu historia' }
                    }
                ]
            }
        });
    }
    return json({ type: 4, data: { content: 'Comando no soportado' } });
}
