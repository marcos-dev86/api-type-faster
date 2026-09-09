import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db';
import { handleOptions } from '../../../lib/http';
import { publicarNaSala } from '../../../lib/ably';
import { calcularXpGanho, type ResultadoPartida } from '../../../lib/nivel';

const TENTATIVAS_ESPERA = 6;
const INTERVALO_ESPERA_MS = 250;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function montarRespostaDaPartidaSalva(partida: any) {
  const host = {
    player_id: partida.host_id,
    name: partida.host_name,
    score: partida.host_score,
    xpGanho: partida.host_xp_ganho,
  };
  const guest = {
    player_id: partida.guest_id,
    name: partida.guest_name,
    score: partida.guest_score,
    xpGanho: partida.guest_xp_ganho,
  };

  return {
    jogadores: [host, guest],
    vencedor: partida.winner_id ? (partida.winner_id === partida.host_id ? host : guest) : null,
    empate: !partida.winner_id,
  };
}

/**
 * POST /api/rooms/:code/finish
 * Fecha a partida, calcula o vencedor com base no placar salvo no banco,
 * concede XP aos dois jogadores e grava a partida no histórico.
 *
 * É seguro chamar essa rota mais de uma vez para a mesma sala (os dois
 * celulares costumam chamar quase ao mesmo tempo, quando o cronômetro
 * zera nos dois). A segurança vem do UPDATE condicional logo abaixo: só
 * uma das duas chamadas consegue trocar o status para 'finished' (ele
 * funciona como uma trava atômica no próprio banco). A que perder a
 * corrida não recalcula nada — ela espera a vencedora salvar e só lê o
 * resultado, evitando XP e histórico duplicados.
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

    // Tenta reservar o direito de finalizar: só quem conseguir trocar o
    // status (rowCount > 0) segue para calcular e gravar. Isso é atômico
    // no Postgres — não existe janela onde as duas chamadas passem juntas.
    const reserva = await sql`
      UPDATE rooms SET status = 'finished'
      WHERE id = ${sala.id} AND status != 'finished'
      RETURNING id
    `;

    if (reserva.length === 0) {
      // Perdeu a corrida (ou a sala já tinha sido finalizada antes): não
      // recalcula nada, só espera a partida aparecer em `matches`.
      for (let tentativa = 0; tentativa < TENTATIVAS_ESPERA; tentativa++) {
        const partidas = await sql`
          SELECT * FROM matches WHERE room_id = ${sala.id} ORDER BY finished_at DESC LIMIT 1
        `;
        if (partidas.length > 0) {
          res.status(200).json(montarRespostaDaPartidaSalva(partidas[0]));
          return;
        }
        await esperar(INTERVALO_ESPERA_MS);
      }

      // Só cai aqui num cenário bem raro (a outra chamada travou no meio).
      res.status(202).json({ erro: 'Partida sendo finalizada, tente novamente em instantes' });
      return;
    }

    const jogadores = await sql`
      SELECT player_id, name, score, words_completed
      FROM room_players
      WHERE room_id = ${sala.id}
    `;

    const host = jogadores.find((j: any) => j.player_id === sala.host_id);
    const guest = jogadores.find((j: any) => j.player_id === sala.guest_id);

    if (!host || !guest) {
      res.status(400).json({ erro: 'A sala não tem os dois jogadores completos' });
      return;
    }

    const empate = host.score === guest.score;
    const vencedorId: string | null = empate
      ? null
      : host.score > guest.score
        ? host.player_id
        : guest.player_id;

    const resultadoHost: ResultadoPartida = empate
      ? 'empate'
      : vencedorId === host.player_id
        ? 'vitoria'
        : 'derrota';

    const resultadoGuest: ResultadoPartida = empate
      ? 'empate'
      : vencedorId === guest.player_id
        ? 'vitoria'
        : 'derrota';

    const xpHost = calcularXpGanho(resultadoHost, host.words_completed);
    const xpGuest = calcularXpGanho(resultadoGuest, guest.words_completed);

    // O status já virou 'finished' na reserva acima — aqui só falta o vencedor.
    await sql`
      UPDATE rooms SET winner_id = ${vencedorId} WHERE id = ${sala.id}
    `;

    // Cria (ou atualiza) o perfil de cada jogador com o resultado desta partida.
    await sql`
      INSERT INTO players (id, name, xp, matches_played, wins, losses)
      VALUES (
        ${host.player_id}, ${host.name}, ${xpHost}, 1,
        ${resultadoHost === 'vitoria' ? 1 : 0}, ${resultadoHost === 'derrota' ? 1 : 0}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = ${host.name},
        xp = players.xp + ${xpHost},
        matches_played = players.matches_played + 1,
        wins = players.wins + ${resultadoHost === 'vitoria' ? 1 : 0},
        losses = players.losses + ${resultadoHost === 'derrota' ? 1 : 0},
        updated_at = NOW()
    `;

    await sql`
      INSERT INTO players (id, name, xp, matches_played, wins, losses)
      VALUES (
        ${guest.player_id}, ${guest.name}, ${xpGuest}, 1,
        ${resultadoGuest === 'vitoria' ? 1 : 0}, ${resultadoGuest === 'derrota' ? 1 : 0}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = ${guest.name},
        xp = players.xp + ${xpGuest},
        matches_played = players.matches_played + 1,
        wins = players.wins + ${resultadoGuest === 'vitoria' ? 1 : 0},
        losses = players.losses + ${resultadoGuest === 'derrota' ? 1 : 0},
        updated_at = NOW()
    `;

    await sql`
      INSERT INTO matches (
        room_id, code, host_id, guest_id, host_name, guest_name,
        host_score, guest_score, host_xp_ganho, guest_xp_ganho, winner_id
      )
      VALUES (
        ${sala.id}, ${codigo}, ${host.player_id}, ${guest.player_id}, ${host.name}, ${guest.name},
        ${host.score}, ${guest.score}, ${xpHost}, ${xpGuest}, ${vencedorId}
      )
    `;

    const hostComXp = { ...host, xpGanho: xpHost };
    const guestComXp = { ...guest, xpGanho: xpGuest };

    const resultado = {
      jogadores: [hostComXp, guestComXp],
      vencedor: empate ? null : vencedorId === host.player_id ? hostComXp : guestComXp,
      empate,
    };

    await publicarNaSala(codigo, 'partida-finalizada', resultado);

    res.status(200).json(resultado);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao finalizar partida' });
  }
}
