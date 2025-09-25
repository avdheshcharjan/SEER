#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { registerTools } from "./tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Create the MCP server
const server = new McpServer({
  name: "boilerplate",
  version: "1.0.0",
});

// Parse ENABLED_TOOLS from environment
const enabledToolsEnv = process.env.ENABLED_TOOLS?.trim();
const enabledTools = enabledToolsEnv
  ? enabledToolsEnv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  : undefined;

// Register tools based on configuration
registerTools(server, enabledTools);

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Hello World Server running...");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
