# TypeFaster API

> Backend serverless do **TypeFaster**, um jogo multiplayer de digitação em tempo real.

Esta API cria salas, controla o início das partidas, registra pontuações e fornece uma fonte confiável para o estado do jogo. Ela foi planejada para trabalhar com o aplicativo mobile feito em **Expo / React Native**.

## Visão geral

O jogo possui dois jogadores em uma sala. Ambos recebem a mesma palavra e o mesmo horário de início; à medida que concluem palavras, o placar é sincronizado em tempo real.

```text
  ┌──────────────────────┐        HTTPS         ┌─────────────────────┐
  │ App Expo | React     │ ──────────────────▶ │ API serverless       │
  │ Native — jogador A/B │                      │ Vercel              │
  └──────────┬───────────┘                      └──────────┬──────────┘
             │                                             │
             │ atualizações em tempo real                  │ consultas SQL
             ▼                                             ▼
┌──────────────────────┐                      ┌──────────────────────┐
│ Ably                 │                      │ Neon                 │
│ canais por sala      │                      │ PostgreSQL           │
└──────────────────────┘                      └──────────────────────┘
```

| Serviço | Responsabilidade |
| --- | --- |
| **Expo / React Native** | Interface do jogo e interação do jogador. |
| **Vercel** | Executa a API sem servidor próprio. |
| **Neon** | Guarda salas, participantes, partidas e placares. |
| **Ably** | Envia eventos instantâneos para os dois celulares. |

## Por que existe uma API?

O aplicativo mobile não deve acessar o Neon usando a senha do banco de dados. A API fica entre o app e o banco para:

- manter segredos em segurança;
- validar quem pode entrar em cada sala;
- definir a palavra e o horário oficial da partida;
- registrar o resultado final;
- emitir tokens temporários para o canal de tempo real.

## Fluxo de uma partida

```text
1. Jogador A cria uma sala
2. API gera um código, por exemplo: A7K2XP
3. Jogador B informa o código e entra na mesma sala
4. Ably avisa os dois jogadores que a sala está completa
5. O anfitrião inicia a partida
6. API escolhe a palavra e registra started_at
7. Cada jogador informa seu progresso
8. Ably sincroniza o placar entre os celulares
9. API encerra a partida e salva o vencedor no Neon
```

## Endpoints planejados

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/rooms` | Cria uma sala e cadastra o anfitrião. |
| `GET` | `/api/rooms/:code` | Obtém o estado atual de uma sala. |
| `POST` | `/api/rooms/:code/join` | Adiciona o segundo jogador. |
| `POST` | `/api/rooms/:code/start` | Inicia a partida com a palavra e o horário oficiais. |
| `POST` | `/api/rooms/:code/progress` | Atualiza placar e palavras concluídas de um jogador. |
| `POST` | `/api/rooms/:code/finish` | Finaliza a partida e registra o vencedor. |
| `POST` | `/api/ably-token` | Fornece um token temporário para o canal da sala. |

### Exemplo — criar uma sala

**Requisição**

```http
POST /api/rooms
Content-Type: application/json

{
  "playerId": "f83fc3f0-54f3-4209-bebd-8bc5d5b94517",
  "name": "João"
}
```

**Resposta**

```json
{
  "roomId": "3d5a7c89-bef4-4aa3-9e50-04e43d647ef2",
  "code": "A7K2XP",
  "status": "waiting"
}
```
