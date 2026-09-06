/**
 * Banco de palavras do jogo. TODAS devem ter exatamente 5 letras.
 * Adicione aqui até ter pelo menos 100 palavras — o jogo funciona com
 * menos, mas a graça da regra de "não repetir para o mesmo jogador"
 * só aparece de verdade com um banco grande.
 *
 * Dica: mantenha tudo em MAIÚSCULAS, sem acento e sem espaço.
 */
const PALAVRAS_BASE = [
  'CARRO', 'LIVRO', 'PRATO', 'AMIGO', 'SEVEN', 'VERDE', 'PRETO', 'BANCO', 'CAMPO', 'FESTA',
  'TERRA', 'PORTA', 'FRUTA', 'NOITE', 'PONTE', 'VIDRO', 'TIGRE', 'DENTE',
  'FALAR', 'GRAVE', 'NUVEM', 'LOBOS', 'NEGRO', 'AURAX',

  // 👇 Adicione o restante das suas palavras de 5 letras aqui embaixo.
];

// Garante que nenhuma palavra mal digitada (com acento, espaço, ou tamanho
// diferente de 5) quebre o sorteio — ela é ignorada e um aviso aparece no
// log da Vercel, em vez de a API dar erro 500 no meio do jogo.
function validarPalavras(lista: string[]): string[] {
  const validas: string[] = [];

  for (const palavra of lista) {
    const normalizada = palavra.trim().toUpperCase();
    if (normalizada.length !== 5) {
      console.warn(`[palavras] Ignorando "${palavra}": precisa ter exatamente 5 letras.`);
      continue;
    }
    validas.push(normalizada);
  }

  return validas;
}

export const PALAVRAS: string[] = validarPalavras(PALAVRAS_BASE);

/**
 * Sorteia uma palavra para um jogador específico, evitando repetir
 * qualquer palavra que ele já tenha recebido NESTA partida.
 * Cada jogador tem seu próprio sorteio — não precisa ter relação
 * nenhuma com a palavra do adversário.
 */
export function sortearPalavra(usadasPeloJogador: string[]): string {
  const disponiveis = PALAVRAS.filter((palavra) => !usadasPeloJogador.includes(palavra));

  // Se (improvável) o jogador já usou todas as palavras do banco,
  // libera o banco inteiro de novo em vez de travar o jogo.
  const banco = disponiveis.length > 0 ? disponiveis : PALAVRAS;

  return banco[Math.floor(Math.random() * banco.length)];
}
