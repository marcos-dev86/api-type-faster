/**
 * Sistema de nível/XP do jogador.
 * XP nunca diminui — perder uma partida rende menos XP que vencer,
 * mas todo mundo ganha algo por participar.
 */

const XP_POR_NIVEL = 300; // quanto de XP acumulado é preciso para subir 1 nível
const XP_BASE_PARTICIPACAO = 20;
const XP_BONUS_VITORIA = 80;
const XP_BONUS_EMPATE = 30;
const XP_POR_PALAVRA_CERTA = 5;

export type ResultadoPartida = 'vitoria' | 'derrota' | 'empate';

export function calcularXpGanho(resultado: ResultadoPartida, palavrasCertas: number): number {
  const bonusDesempenho = Math.max(0, palavrasCertas) * XP_POR_PALAVRA_CERTA;

  const bonusResultado =
    resultado === 'vitoria' ? XP_BONUS_VITORIA : resultado === 'empate' ? XP_BONUS_EMPATE : 0;

  return XP_BASE_PARTICIPACAO + bonusResultado + bonusDesempenho;
}

export function calcularNivel(xpTotal: number): number {
  return 1 + Math.floor(Math.max(0, xpTotal) / XP_POR_NIVEL);
}

/** XP que já foi "gasto" nos níveis anteriores e quanto falta pro próximo. */
export function progressoDoNivel(xpTotal: number) {
  const nivel = calcularNivel(xpTotal);
  const xpNoNivelAtual = Math.max(0, xpTotal) - (nivel - 1) * XP_POR_NIVEL;
  return {
    nivel,
    xpNoNivelAtual,
    xpParaProximoNivel: XP_POR_NIVEL,
    progresso: xpNoNivelAtual / XP_POR_NIVEL, // 0 a 1, útil pra barra de XP
  };
}
