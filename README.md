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

O Expo Web e o Expo Go executam o modo de demonstração. A IA real usa `llama.rn`, que contém código nativo e exige um Development Build:

```bash
cd apps/mobile
npx expo run:android
```

Ou, usando EAS para gerar um APK de desenvolvimento:

```bash
cd apps/mobile
npx eas build --profile development --platform android
```

No primeiro acesso, escolha idioma e nível. O app oferece o download local do Qwen2.5 0.5B Instruct Q4_K_M (~491 MB); depois do download, a conversa é processada no aparelho.

#### Android no Windows

O build nativo do Reanimated exige Ninja 1.12 ou superior para lidar com os caminhos longos gerados pelo CMake. Verifique com:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\cmake\3.22.1\bin\ninja.exe" --version
```

Se a versão for anterior, atualize o Ninja/CMake pelo Android Studio antes de compilar. Os avisos de APIs antigas do Gradle não impedem o build. A mensagem `Hexagon SDK not found` apenas informa que o `llama.rn` usará CPU no emulador.

O endpoint `GET /health` funciona sem banco. Os módulos que persistem dados exigirão `DATABASE_URL`.

### Banco no Supabase

1. Crie um projeto no Supabase e copie a URI do **Transaction pooler** em `Connect`.
2. Preencha `DATABASE_URL` e um `JWT_SECRET` aleatório em `apps/api/.env`.
3. Execute `npm run db:migrate` para criar as tabelas.
4. Copie `apps/mobile/.env.example` para `apps/mobile/.env` e informe o endereço da API.

O aplicativo usa o PostgreSQL hospedado pelo Supabase, mas a autenticação é própria da API. Não é necessário habilitar o Supabase Auth.

Rotas disponíveis: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` e `GET /auth/me`.

### Confirmação de e-mail

A API usa o Resend para confirmar novos endereços. Configure `RESEND_API_KEY`, `EMAIL_FROM` e `API_PUBLIC_URL` em `apps/api/.env`. O domínio presente em `EMAIL_FROM` deve estar verificado no Resend para enviar a usuários reais.

No cadastro, a API cria um token de uso único com validade de 24 horas e armazena somente seu hash. Também estão disponíveis `POST /auth/resend-verification` e `GET /auth/verify-email?token=...`.

## Decisões iniciais

- Google e Apple autenticam a identidade; a API troca o token validado do provedor por uma sessão própria.
- Sessões usam access token curto e refresh token rotativo armazenado como hash.
- A assinatura é uma permissão (`entitlement`) validada no servidor a partir das lojas, nunca apenas um estado local.
- A conversa e a inferência ficam no aparelho. A interface `LocalConversationEngine` isola o app do runtime/modelo escolhido.
- O app deve oferecer download opcional do modelo por idioma/dispositivo; modelos não devem ser empacotados no binário inicial.

