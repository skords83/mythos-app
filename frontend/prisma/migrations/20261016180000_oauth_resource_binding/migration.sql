-- Legacy credentials remain unbound and cannot authenticate to MCP.
ALTER TABLE "OAuthAuthorizationCode" ADD COLUMN "resource" TEXT;
ALTER TABLE "OAuthAccessToken" ADD COLUMN "resource" TEXT;
