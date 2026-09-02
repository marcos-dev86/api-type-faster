import Ably from 'ably';

if (!process.env.ABLY_API_KEY) {
  throw new Error('ABLY_API_KEY não configurada. Defina essa variável de ambiente na Vercel.');
}

// Cliente REST do Ably (usado apenas no backend, nunca no app).
export const ably = new Ably.Rest(process.env.ABLY_API_KEY);

/**
 * Publica um evento no canal da sala. Cada sala tem seu próprio canal,
 * no formato room:CODIGO, para que os dois celulares recebam
 * atualizações em tempo real.
 */
export async function publicarNaSala(codigo: string, evento: string, dados: unknown) {
  const canal = ably.channels.get(`room:${codigo.toUpperCase()}`);
  await canal.publish(evento, dados);
}
