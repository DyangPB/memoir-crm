/** An MCP API key as the app shows it: never the secret, only enough to recognise it. */
export type McpKeySummary = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
};
