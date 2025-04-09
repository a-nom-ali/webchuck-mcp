import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";

export class Prompts {
    private prompts!: Prompts;

    constructor(
        private mcpServer: McpServer,
    ) {
        this.configurePrompts();
    }

    private configurePrompts(): void {
        this.prompts = new Prompts(this.mcpServer)

        this.mcpServer.prompt("webchuck_syntax_reminder",
            "A reminder prompt to help the AI chat agent stay on track.",
            () => ({
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `WebChucK Syntax Reminder:

When working with ChucK in this conversation, please follow these guidelines to avoid common errors:

1. WORKFLOW ESSENTIALS:
   - Always get a session ID first with getSessions
   - Attempt to load ALL samples at once with preloadSamples as incremental loading is experimental
   - Use debugPreload to verify which samples actually loaded
   - Only use the EXACT virtualFilenames from debugPreload results
   - Check debugExecutions after every code execution

2. CHUCK-SPECIFIC SYNTAX (NOT C/C++):
   - ChucK uses => for audio routing AND assignment (different from C/C++):
     • 0.5 => float gain;  // ChucK assignment (not gain = 0.5;)
     • SinOsc sin => dac;  // ChucK audio routing (totally unique)
   - Time requires the :: operator: 1::second (not found in C/C++)
   - Connect audio units with => not with function calls
   - Sporking: spork ~ functionName(); (ChucK's way to create concurrent processes)
   - Time advancement: 1::second => now; (no equivalent in C/C++)

3. COMMON ERRORS TO AVOID:
   - Don't use C/C++ assignment with = for ChucK assignment (use => instead)
   - Cannot multiply (*) directly on UGen object references (use intermediate variables)
   - Cannot use "beat" directly as a duration without first defining it as a dur type
   - Don't use C/C++ thread creation (use ChucK's spork ~ instead)
   - Don't reference array indices outside their bounds
   - Don't assume samples loaded successfully without checking debugPreload
   - Don't create filenames - use exact virtualFilenames from debugPreload

4. SAMPLE PLAYBACK:
   - SndBuf requires exact virtualFilenames (from debugPreload results)
   - Reset playhead with 0 => buf.pos; before playing
   - Set gain appropriately (0.0-1.0 range is typical)
   - Use ADSR envelopes for clean starts/stops

5. AUDIO ROUTING BASICS:
   - Sound generators → processors → dac (output)
   - Example: SinOsc osc => LPF filter => NRev reverb => dac;
   - Connect to blackhole for control signals that don't make sound

Always check errors with debugExecutions after each code execution. When in doubt, use intermediate variables for complex operations. Remember that ChucK has its own unique syntax that differs significantly from C, C++, and JavaScript.`
                    }
                }]
            })
        );

        this.mcpServer.prompt("webchuck_demo",
            "A demo prompt to showcase the Chuck features.",
            () => ({
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `# ChucK Sonic Playground: Crafting Your 80s Synthwave Universe

In this exercise, you'll create a mesmerizing 80s-inspired synthwave loop track using ChucK's powerful real-time sound synthesis capabilities.

## Background

ChucK offers precise timing control and flexible audio manipulation—perfect for creating the lush, atmospheric textures and pulsing rhythms of synthwave music. You'll build a loop track from the ground up, layering different elements to achieve that classic retro-futuristic gaming sound.

## Your Mission

Create a continuously looping synthwave composition with these key elements:

1. **Rhythmic Foundation**: Four-on-the-floor kick pattern with synthetic percussion
2. **Melodic Elements**: Arpeggiated synthesizers and lead melody lines
3. **Atmospheric Textures**: Pads and ambient sounds with generous reverb
4. **Dynamic Evolution**: Filter sweeps and gradual introduction of elements

## Getting Started

### Setting Your Environment

Begin with tempo and musical key settings:
\`\`\`chuck
// Set BPM for that perfect 80s pulse
110 => float BPM;
(60.0/BPM)::second => dur beat;

// A minor is perfect for that melancholic synthwave feel
[57, 59, 60, 62, 64, 65, 67, 69] @=> int amin[];
\`\`\`

### Building Your Sample Arsenal

Create at least these core samples:

1. **Bass**: Deep, punchy foundation
   - Electric bass samples or SinOsc/SawOsc with envelope shaping
   - Apply subtle filtering for warmth

2. **Drums**: Synthetic percussion
   - Kick drum using SinOsc with rapid pitch drop
   - Snare using filtered noise
   - Hi-hats using high-passed noise with short envelope

3. **Lead Synth**: Memorable melody
   - SinOsc or SawOsc through resonant filter
   - Add delay and reverb for spaciousness

4. **Atmospheric Pads**: Lush backdrop
   - Multiple oscillators slightly detuned
   - Long attack and release times
   - Heavy reverb for that dreamy quality

5. **Arpeggiated Elements**: Movement and rhythm
   - Rapid sequencing of chord tones
   - Consider classic patterns (up, down, up-down)

## Programming Techniques

Implement these ChucK-specific techniques:

1. **Sporking**: Use \`spork ~\` to create concurrent sound layers
2. **Time Loops**: Create clean loop structures that synchronize perfectly
3. **Parameter Automation**: Gradually change filter cutoffs over time
4. **Modulation**: Use LFOs to create movement in your sounds
5. **Signal Processing**: Add effects chains with reverb, delay, and filtering

## Structure Your Composition

1. **Intro Section**: Begin with minimal elements (perhaps just bass and drums)
2. **Build Section**: Gradually introduce arpeggios and pads
3. **Main Section**: Full arrangement with lead melody
4. **Variation**: Subtle changes to keep interest during looping

## Sample Starting Framework

\`\`\`chuck
// Master output path with reverb
NRev masterReverb => dac;
0.1 => masterReverb.mix;

// Function for filter sweeps - essential for synthwave
fun void filterSweep(LPF filter) {
    while(true) {
        // Sweep logic here
    }
}

// Function for your lead melody
fun void playLead() {
    // Melody sequencing here
}

// Function for endless looping
fun void mainLoop() {
    while(true) {
        // Main sequence logic
    }
}
\`\`\`

## Creative Challenges

1. **Retro Artifact**: Add vinyl crackle or tape hiss for authentic retro feel
2. **Dramatic Transitions**: Program filter drops or tension-building effects
3. **Evolving Texture**: Create pads that slowly evolve over multiple loops
4. **Dynamic Response**: Use math functions to create natural-feeling dynamics

Remember, the goal is to create a lush, immersive synthwave track that captures that perfect 80s nostalgic vibe while looping seamlessly forever. Let your digital heart compose the soundtrack to a neon-lit cyberpunk world!`
                    }
                }]
            })
        );

        this.mcpServer.prompt("webchuck_assistant_guide",
            "A prompt to guide the user.",
            () => ({
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `    # WebChucK MCP Assistant Guide

    The WebChucK MCP system includes an AI assistant that can help you with your music and audio development process. Here's how to use it:

    ## Executing Code

    Use the \`executeCode\` tool to execute ChucK in WebChucK

    ## Stop Code Execution

    Use the \`stopExecution\` tool to stop any ChucK code that might currently be running in WebChucK

    ## Working with the Assistant

    1. Start by getting insights about your task
    2. Ask for specific suggestions based on the insights
    3. Implement the suggestions using the WebChucK MCP tools
    4. Get new insights to see how your changes have improved the sound

    The assistant works best when you provide specific context about what you're trying to achieve. For example, instead of asking for general suggestions, ask for suggestions about a specific aspect of your audio journey.

    Remember that the assistant is a tool to enhance your creativity, not replace it. Use its suggestions as inspiration for your own ideas.`
                    }
                }]
            }));
    }

}