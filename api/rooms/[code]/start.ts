import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';

const PALAVRAS = [
  'CARRO', 'LIVRO', 'PRATO', 'VERDE', 'PRETO', 'BANCO', 'CAMPO', 'FESTA',
  'TERRA', 'PORTA', 'FRUTA', 'NOITE', 'PONTE', 'VIDRO', 'TIGRE', 'DENTE',
  'FALAR', 'GRAVE', 'NUVEM', 'LOBOS',
];

function palavraAleatoria(): string {
  return PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
}

/**
 * POST /api/rooms/:code/start
 * Escolhe a palavra e marca o horário oficial de início.
 * Como o started_at vem do servidor, os dois celulares começam
 * exatamente na mesma partida, no mesmo instante.
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

    const palavra = palavraAleatoria();

    const [salaAtualizada] = await sql`
      UPDATE rooms
      SET status = 'playing', word = ${palavra}, started_at = NOW()
      WHERE id = ${sala.id}
      RETURNING id, code, status, word, started_at
    `;

    await publicarNaSala(codigo, 'partida-iniciada', salaAtualizada);

    res.status(200).json({ sala: salaAtualizada });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao iniciar partida' });
  }
}
