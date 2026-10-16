# Mythos ChatGPT integration – development status

**Status: experimental, not production-ready. Do not merge or deploy yet.**

## Routes

- `GET /api/integrations/chatgpt?action=projects`: internal read-only REST adapter.
- `POST /api/integrations/mcp`: experimental stateless JSON-RPC MCP adapter.
- `GET /api/integrations/mcp`: HTTP 405.

Available MCP tools: `mythos_projects`, `mythos_chapters`, `mythos_chapter`, `mythos_characters`, `mythos_places`, `mythos_timeline`, `mythos_lore`.

## Development-only authentication

The implementation is **disabled by default**. It only responds to a bearer token when both environment variables are set:

- `MYTHOS_INTEGRATION_READ_TOKEN`: cryptographically random secret, at least 32 characters, **never commit or paste into chat**.
- `MYTHOS_INTEGRATION_USER_ID`: exact Mythos user ID. Only projects owned by this user are listed.

These variables are NOT to be configured in production yet. The current static token is not a replacement for a user-authorized, revocable OAuth connection.

## Local verification before any deployment

From `frontend/` after installing project dependencies and generating Prisma Client:

```sh
npm test -- --runInBand src/app/api/integrations/chatgpt/route.test.ts src/app/api/integrations/mcp/route.test.ts
npx tsc --noEmit
npm run build
```

Tests added in this branch have **not been run** by the GitHub connector; results must be inspected locally or in CI.

## Outstanding security and compatibility work

1. Implement proper OAuth authorization-code + PKCE, token lifecycle, revocation, and per-user binding. Do not expose a long-lived static token to a third party.
2. Validate remote MCP Streamable HTTP interoperability and supported protocol versions against current ChatGPT requirements.
3. Add application-layer rate limits, logging without sensitive data, and deploy behind HTTPS.
4. Add end-to-end database tests with multiple users and mixed FAMILY/PRIVATE records.
5. Review returned fields for sensitive data and implement bounded chapter output/response pagination.
6. Test deployment on staging, then obtain explicit approval before production rollout.

The endpoint must remain disabled until the above items are resolved.
