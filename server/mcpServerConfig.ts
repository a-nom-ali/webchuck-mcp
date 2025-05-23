import {Logger} from "../utils/logger.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {SessionsManager} from "./sessionsManager.js";
import {AudioService} from "./audioService.js";
import {CodeTools} from "./Tools/codeTools.js";
import {CombinedTools} from "./Tools/combinedTools.js";
import {SampleTools} from "./Tools/sampleTools.js";
import {SessionTools} from "./Tools/sessionTools.js";
import {SnippetTools} from "./Tools/snippetTools.js";
import {VolumeTools} from "./Tools/volumeTools.js";
import {ExampleResource} from "./Resources/exampleResource.js";
import {SampleResource} from "./Resources/sampleResource.js";
import {Prompts} from "./Prompts/prompts.js";
import {ParameterTools} from "./Tools/parameterTools.js";

export class McpServerConfig {
    private codeTools!: CodeTools;
    private combinedTools!: CombinedTools;
    private parameterTools!: ParameterTools;
    private sampleTools!: SampleTools;
    private sessionTools!: SessionTools;
    private snippetTools!: SnippetTools;
    private volumeTools!: VolumeTools;

    private prompts!: Prompts;

    private exampleResource!: ExampleResource;
    private sampleResource!: SampleResource;


    constructor(
        private mcpServer: McpServer,
        private sessionsManager: SessionsManager,
        private audioService: AudioService,
        private logger: Logger,
        private port: any,
        private working_directory: string
    ) {
        this.configureTools();
        this.configureResources();
        this.configurePrompts();
    }

    private configureTools(): void {
        this.sessionTools = new SessionTools(this.mcpServer, this.sessionsManager, this.logger, this.port, this.working_directory);
        this.codeTools = new CodeTools(this.mcpServer, this.sessionsManager, this.audioService, this.logger, this.port, this.working_directory);
        this.combinedTools = new CombinedTools(this.mcpServer, this.port);
        this.parameterTools = new ParameterTools(this.mcpServer, this.sessionsManager, this.logger, this.port);
        this.sampleTools = new SampleTools(this.mcpServer, this.sessionsManager, this.audioService, this.logger, this.port, this.working_directory);
        this.snippetTools = new SnippetTools(this.mcpServer, this.sessionsManager, this.logger);
        this.volumeTools = new VolumeTools(this.mcpServer, this.logger);
    }

    private configureResources(): void {
        this.exampleResource = new ExampleResource(this.mcpServer);
        this.sampleResource = new SampleResource(this.mcpServer, this.audioService, this.logger);
    }

    private configurePrompts(): void {
        this.prompts = new Prompts(this.mcpServer)
    }

}