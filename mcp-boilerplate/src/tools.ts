import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface ToolDefinition {
  name: string;
  description: string;
  schema: any;
  handler: (params: any) => Promise<any>;
}

const tools: ToolDefinition[] = [
  {
    name: "hello-world",
    description: "Say hello to the user",
    schema: {
      name: z.string().describe("The name of the user"),
    },
    handler: async ({ name }) => {
      const response = `Hello ${name}`;
      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    },
  },
  {
    name: "get-mcp-docs",
    description: "Make an MCP server",
    schema: {
      name: z.string().describe("The name of the MCP server"),
    },
    handler: async () => {
      const response = `
# Main file for the MCP server

\`\`\`ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create the MCP server
const server = new McpServer({
  name: "hello-world",
  version: "1.0.0",
});

// Tool: Store conversation with embeddings
server.tool(
  "hello-world",
  "Say hello to the user",
  {
    name: z.string().describe("The name of the user"),
  },
  async ({ name }) => {
    const response = \`Hello \${name}\`;

    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  }
);

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
\`\`\`
`;
      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    },
  },
];

export function registerTools(server: McpServer, enabledTools?: string[]) {
  const toolsToRegister =
    enabledTools && enabledTools.length > 0
      ? tools.filter((tool) => enabledTools.includes(tool.name))
      : tools;

  for (const tool of toolsToRegister) {
    server.tool(tool.name, tool.description, tool.schema, tool.handler);
  }

  console.error(
    `Registered ${toolsToRegister.length} tools: ${toolsToRegister
      .map((t) => t.name)
      .join(", ")}`
  );
}
