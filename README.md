# typefaster-api

API serverless do jogo **TypeFaster** (o jogo de digitação multiplayer em `sala.tsx` / `digitacao.tsx`).

Arquitetura:

```
Expo (app)  →  HTTP  →  API na Vercel (este projeto)  →  Neon Postgres
                              │
                              └────────────→  Ably (tempo real)
```

- **Neon**: guarda salas, jogadores e placares.
- **Esta API**: regras do jogo (criar sala, entrar, iniciar, salvar progresso). É quem fala com o Neon — o app nunca acessa o banco direto.
- **Ably**: avisa os dois celulares em tempo real quando algo muda na sala.

---

## 1. Configurar o banco (Neon)

1. Abra o editor SQL do seu projeto no Neon.
2. Rode o script `sql/schema.sql` deste repositório. Ele cria as tabelas `rooms` e `room_players`.
3. Copie a *connection string* do Neon (algo como `postgresql://usuario:senha@host.neon.tech/dbname?sslmode=require`).

## 2. Instalar dependências

```bash
npm install
```

## 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
DATABASE_URL=postgresql://...      # connection string do Neon
ABLY_API_KEY=xxxxx.yyyyy:zzzzz     # chave da sua app no Ably (Root key)
```

Nunca coloque esses valores no app Expo — eles ficam só aqui, no backend.

## 4. Rodar localmente

```bash
npx vercel dev
```

Isso sobe a API em `http://localhost:3000`. Teste com:

```bash
curl http://localhost:3000/api/health
```

## 5. Subir para o GitHub e conectar na Vercel

1. Crie um repositório **privado** no GitHub (ex: `typefaster-api`) e faça o push deste projeto.
2. Na Vercel: **Add New → Project** e importe o repositório.
3. Em **Settings → Environment Variables**, cadastre `DATABASE_URL` e `ABLY_API_KEY`.
4. Faça o deploy. A Vercel vai gerar uma URL como `https://typefaster-api.vercel.app`.

A cada push na branch principal, a API é publicada automaticamente.

---

## Rotas disponíveis

| Método | Rota | Função | Body |
|---|---|---|---|
| GET | `/api/health` | Testa se a API está no ar | — |
| POST | `/api/rooms` | Cria uma sala, devolve o código | `{ playerId, playerName }` |
| GET | `/api/rooms/:code` | Estado atual da sala e jogadores | — |
| POST | `/api/rooms/:code/join` | Segundo jogador entra na sala | `{ playerId, playerName }` |
| POST | `/api/rooms/:code/start` | Sorteia a palavra e inicia a partida | — |
| POST | `/api/rooms/:code/progress` | Salva pontuação/palavras concluídas | `{ playerId, score, wordsCompleted }` |
| POST | `/api/rooms/:code/finish` | Fecha a partida e define o vencedor | — |
| POST | `/api/ably-token` | Gera token temporário do Ably para o app | `{ playerId, code? }` |

`playerId` deve ser um UUID (as colunas no Postgres são `UUID`). No app, gere um
UUID por celular na primeira abertura e salve com `AsyncStorage` — por exemplo
usando `expo-crypto`:

```ts
import * as Crypto from 'expo-crypto';
const playerId = Crypto.randomUUID();
```

### Exemplo: criar sala

```bash
curl -X POST https://typefaster-api.vercel.app/api/rooms \
  -H "Content-Type: application/json" \
  -d '{ "playerId": "11111111-1111-1111-1111-111111111111", "playerName": "JOAO" }'
```

Resposta:

```json
{ "sala": { "id": "...", "code": "A7K2XP", "status": "waiting", "created_at": "..." } }
```

---

## Integrando com o app Expo

No app, crie um `lib/api.ts` apontando para a URL da Vercel:

```ts
const API_URL = 'https://typefaster-api.vercel.app';

export async function criarSala(playerId: string, playerName: string) {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, playerName }),
  });
  return res.json();
}
```

Para tempo real, use o token gerado por `/api/ably-token` para autenticar o
cliente Ably no app (`ably` tem SDK oficial para React Native/Expo) e inscreva-se
no canal `room:CODIGO` para receber os eventos:

- `jogador-entrou`
- `partida-iniciada`
- `progresso-atualizado`
- `partida-finalizada`

### Próximos passos sugeridos no app

1. Em `sala.tsx`: trocar os dados fake por chamadas reais a `criarSala` /
   `entrarSala`, e navegar para `digitacao.tsx` só depois que o segundo
   jogador entrar (evento `jogador-entrou`).
2. Em `digitacao.tsx`: usar a `word` e o `started_at` que vêm da API (rota
   `start`) em vez de sortear a palavra localmente, e substituir o placar
   simulado do oponente pelos eventos `progresso-atualizado` do Ably.

---

## Estrutura do projeto

```
typefaster-api/
├── api/
│   ├── health.ts
│   ├── ably-token.ts
│   └── rooms/
│       ├── index.ts            (POST cria sala)
│       └── [code]/
│           ├── index.ts        (GET estado da sala)
│           ├── join.ts         (POST entrar)
│           ├── start.ts        (POST iniciar partida)
│           ├── progress.ts     (POST salvar progresso)
│           └── finish.ts       (POST finalizar partida)
├── lib/
│   ├── db.ts                   (cliente Neon)
│   ├── ably.ts                 (cliente Ably)
│   └── http.ts                 (CORS)
├── sql/
│   └── schema.sql
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```
