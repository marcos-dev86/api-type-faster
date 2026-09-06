import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';
import { sortearPalavra } from '../../../lib/palavras';

/**
 * POST /api/rooms/:code/start
 * Marca o horário oficial de início (started_at vem do servidor, então os
 * dois celulares usam o MESMO relógio para o cronômetro). A palavra, porém,
 * é sorteada de forma independente para cada jogador — os dois não
 * precisam receber a mesma palavra.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' });
    return;
  }

  const codigo = String(req.query.code ?? '').toUpperCase();

  try {
    const salas = await sql`SELECT * FROM rooms WHERE code = ${codigo}`;

    if (salas.length === 0) {
      res.status(404).json({ erro: 'Sala não encontrada' });
      return;
    }

    const sala = salas[0];

    if (!sala.guest_id) {
      res.status(400).json({ erro: 'A sala precisa de dois jogadores para iniciar' });
      return;
    }

    if (sala.status === 'playing') {
      res.status(409).json({ erro: 'A partida já foi iniciada' });
      return;
    }

    // Cada jogador começa sem palavras usadas ainda, então o primeiro
    // sorteio de cada um é livre dentro do banco inteiro.
    const palavraHost = sortearPalavra([]);
    const palavraGuest = sortearPalavra([]);

    const [salaAtualizada] = await sql`
      UPDATE rooms
      SET status = 'playing', started_at = NOW()
      WHERE id = ${sala.id}
      RETURNING id, code, status, started_at
    `;

    await sql`
      UPDATE room_players
      SET score = 0, words_completed = 0, current_word = ${palavraHost}, used_words = ARRAY[${palavraHost}]::text[]
      WHERE room_id = ${sala.id} AND player_id = ${sala.host_id}
    `;

    await sql`
      UPDATE room_players
      SET score = 0, words_completed = 0, current_word = ${palavraGuest}, used_words = ARRAY[${palavraGuest}]::text[]
      WHERE room_id = ${sala.id} AND player_id = ${sala.guest_id}
    `;

    // Não publicamos a palavra de ninguém aqui — cada celular busca a sua
    // própria palavra em GET /api/rooms/:code/word.
    await publicarNaSala(codigo, 'partida-iniciada', salaAtualizada);

    res.status(200).json({ sala: salaAtualizada });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao iniciar partida' });
  }
}
