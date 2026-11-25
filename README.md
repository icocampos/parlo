# Parlo

Aplicativo mobile de prática de idiomas com conversação por IA local.

## Estrutura

- `apps/api`: API Fastify, Zod, Drizzle e PostgreSQL.
- `apps/mobile`: aplicativo Expo/React Native.
- `packages/shared`: contratos e tipos que podem ser usados nos dois apps.

## Desenvolvimento

Requisitos: Node.js 22+ e PostgreSQL.

```bash
npm install
copy apps\api\.env.example apps\api\.env
npm run dev:api
```

Em outro terminal:

```bash
npm run dev:mobile
```

O endpoint `GET /health` funciona sem banco. Os módulos que persistem dados exigirão `DATABASE_URL`.

## Decisões iniciais

- Google e Apple autenticam a identidade; a API troca o token validado do provedor por uma sessão própria.
- Sessões usam access token curto e refresh token rotativo armazenado como hash.
- A assinatura é uma permissão (`entitlement`) validada no servidor a partir das lojas, nunca apenas um estado local.
- A conversa e a inferência ficam no aparelho. A interface `LocalConversationEngine` isola o app do runtime/modelo escolhido.
- O app deve oferecer download opcional do modelo por idioma/dispositivo; modelos não devem ser empacotados no binário inicial.

