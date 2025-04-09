import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";

export class CombinedTools {
    constructor(
        private mcpServer: McpServer,
        private port: any,
    ) {
        this.configureTools();
    }

    private configureTools(): void {
        this.mcpServer.tool("playWithSamples",
            "A convenience function that combines preloading samples and executing code in one step. This is useful for creating compositions that immediately use the loaded samples:\n" +
            "\n" +
            "* Handles both preloading the specified samples and executing the provided ChucK code\n" +
            "* More efficient than calling preloadSamples and executeChucK separately\n" +
            "* Still requires checking debugSessions afterward to verify which samples loaded successfully\n" +
            "* If you need to know exactly which samples loaded before writing your code, use the separate preloadSamples approach instead\n" +
            "* Remember that samples aren't loaded additively - specify all samples you need in a single call\n" +
            "\n" +
            "This tool can streamline your workflow if you know exactly which samples you want to use, but it's less flexible if you need to check which samples successfully loaded before finalizing your composition.",
            {
                code: z.string().describe("The ChucK code to execute"),
                samples: z.array(z.string()).describe("Array of sample names to preload before execution"),
                sessionId: z.string().describe("Session ID for an existing WebChucK session")
            },
            async ({code, samples, sessionId}) => {
                try {
                    // First preload the samples
                    const preloadResponse = await fetch(`https://localhost:${this.port}/api/preload`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            samples,
                            sessionId
                        }),
                    });

                    if (!preloadResponse.ok) {
                        throw new Error(`Preload error: ${preloadResponse.status}`);
                    }

                    // Wait a moment for preloading to complete
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Then execute the code
                    const executeResponse = await fetch(`https://localhost:${this.port}/api/execute`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            code,
                            sessionId
                        }),
                    });

                    if (!executeResponse.ok) {
                        throw new Error(`Execute error: ${executeResponse.status}`);
                    }

                    const data = await executeResponse.json();

                    return {
                        content: [{
                            type: "text",
                            text: `Preloaded samples (${samples.join(', ')}) and started execution: ${data.message || "Code running"}`
                        }]
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    return {
                        content: [{
                            type: "text",
                            text: `Error: ${errorMessage}`
                        }]
                    };
                }
            }
        );
    }
}