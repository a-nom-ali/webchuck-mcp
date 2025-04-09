import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js";

export class ExampleResource {
    constructor(
        private mcpServer: McpServer,
    ) {
        this.configureResource();
    }

    private configureResource(): void {
        // ==== Create Dynamic Resource for ChucK Examples ====
        this.mcpServer.resource(
            "chuck-example",
            new ResourceTemplate("chuck-example://{category}/{name}", {
                list: async () => {
                    const examples = [
                        {category: "basics", name: "sine-wave"},
                        {category: "basics", name: "square-wave"},
                        {category: "basics", name: "fm-synthesis"},
                        {category: "effects", name: "reverb"},
                        {category: "effects", name: "echo"},
                        {category: "effects", name: "chorus"},
                        {category: "mixing", name: "simple-mixer"},
                        {category: "mixing", name: "stereo-panner"},
                        {category: "sampling", name: "file-playback"},
                        {category: "sampling", name: "granular"},
                        {category: "drums", name: "drum-machine"},
                        {category: "drums", name: "drum-sequencer"}
                    ];
                    return {
                        resources: examples.map(example => ({
                            name: `${example.category}: ${example.name}`,
                            uri: `chuck-example://${example.category}/${example.name}`
                        }))
                    };
                }
            }),
            async (uri, {category, name}) => {
                // Create example code based on category and name
                let code = "";
                let description = "";

                // Basic examples
                if (category === "basics") {
                    if (name === "sine-wave") {
                        code = `// Simple sine wave oscillator
SinOsc s => dac;
0.5 => s.gain;
220 => s.freq;
2::second => now;`;
                        description = "A basic sine wave oscillator at 220Hz";
                    } else if (name === "square-wave") {
                        code = `// Square wave oscillator
SqrOsc s => dac;
0.3 => s.gain;  // Lower gain for square wave to avoid clipping
220 => s.freq;
2::second => now;`;
                        description = "A basic square wave oscillator at 220Hz";
                    } else if (name === "fm-synthesis") {
                        code = `// FM synthesis example
SinOsc modulator => SinOsc carrier => dac;
// Carrier settings
0.5 => carrier.gain;
440 => carrier.freq;
// Modulator settings
300 => modulator.freq;
1000 => modulator.gain;
// Let it play
5::second => now;`;
                        description = "Frequency modulation synthesis example";
                    }
                }

                // Effects examples
                else if (category === "effects") {
                    if (name === "reverb") {
                        code = `// Reverb effect example
SinOsc s => JCRev rev => dac;
0.5 => s.gain;
440 => s.freq;
0.2 => rev.mix;
5::second => now;`;
                        description = "Adding reverb to a sine wave oscillator";
                    } else if (name === "echo") {
                        code = `// Echo effect example
SinOsc s => Echo echo => dac;
0.5 => s.gain;
440 => s.freq;
250::ms => echo.delay;
0.5 => echo.mix;
0.7 => echo.gain;
5::second => now;`;
                        description = "Adding echo to a sine wave oscillator";
                    } else if (name === "chorus") {
                        code = `// Chorus effect example
SinOsc s => Chorus chorus => dac;
0.5 => s.gain;
440 => s.freq;
0.5 => chorus.mix;
5::second => now;`;
                        description = "Adding chorus to a sine wave oscillator";
                    }
                }

                // Mixing examples
                else if (category === "mixing") {
                    if (name === "simple-mixer") {
                        code = `// Simple mixing example
SinOsc s1 => Gain mixer => dac;
SqrOsc s2 => mixer;
TriOsc s3 => mixer;

0.2 => s1.gain;
0.1 => s2.gain;
0.15 => s3.gain;
0.8 => mixer.gain;

220 => s1.freq;
440 => s2.freq;
880 => s3.freq;

5::second => now;`;
                        description = "Mixing multiple oscillators together";
                    } else if (name === "stereo-panner") {
                        code = `// Stereo panning example
SinOsc s => Pan2 pan => dac;
0.5 => s.gain;
440 => s.freq;

// Pan from left to right
-1.0 => pan.pan;
1::second => now;

-0.5 => pan.pan;
1::second => now;

0.0 => pan.pan;
1::second => now;

0.5 => pan.pan;
1::second => now;

1.0 => pan.pan;
1::second => now;`;
                        description = "Panning a sound from left to right";
                    }
                }

                // Sampling examples
                else if (category === "sampling") {
                    if (name === "file-playback") {
                        code = `// File playback example
// Note: Replace "sample.wav" with an actual file from your system
SndBuf buf => dac;
"sample.wav" => buf.read;
0.5 => buf.gain;
buf.length() => now;`;
                        description = "Playing back an audio file";
                    } else if (name === "granular") {
                        code = `// Simple granular synthesis
// Note: Replace "sample.wav" with an actual file from your system
SndBuf buf => dac;
"sample.wav" => buf.read;
0.5 => buf.gain;

// Randomly play short grains from the sample
for (0 => int i; i < 50; i++) {
    // Random position
    Math.random() * buf.samples() => buf.pos;

    // Random gain
    Math.random() * 0.5 => buf.gain;

    // Play a short grain
    100::ms => now;
}`;
                        description = "Basic granular synthesis using an audio file";
                    }
                }

                // Drum examples
                else if (category === "drums") {
                    if (name === "drum-machine") {
                        code = `// Simple drum machine using synthesis
// Kick drum
SndBuf kick => dac;
me.dir() + "/audio_files/kick.wav" => kick.read;
0.5 => kick.gain;

// Snare drum
SndBuf snare => dac;
me.dir() + "/audio_files/snare.wav" => snare.read;
0.5 => snare.gain;

// Hi-hat
SndBuf hihat => dac;
me.dir() + "/audio_files/hihat.wav" => hihat.read;
0.3 => hihat.gain;

// Make sure they don't play automatically
kick.samples() => kick.pos;
snare.samples() => snare.pos;
hihat.samples() => hihat.pos;

// Simple pattern
for (0 => int i; i < 8; i++) {
    // Kick on beats 0 and 4
    if (i == 0 || i == 4) {
        0 => kick.pos;
    }

    // Snare on beats 2 and 6
    if (i == 2 || i == 6) {
        0 => snare.pos;
    }

    // Hi-hat on all beats
    0 => hihat.pos;

    // Wait for next beat
    0.25::second => now;
}`;
                        description = "A simple drum machine pattern";
                    } else if (name === "drum-sequencer") {
                        code = `// More complex drum sequencer
// Load drum samples (or use synthesized sounds)
SndBuf kick => dac;
SndBuf snare => dac;
SndBuf hihat => dac;
SndBuf clap => dac;

// Load samples (adjust paths as needed)
me.dir() + "/audio_files/kick.wav" => kick.read;
me.dir() + "/audio_files/snare.wav" => snare.read;
me.dir() + "/audio_files/hihat.wav" => hihat.read;
me.dir() + "/audio_files/clap.wav" => clap.read;

// Set gains
0.5 => kick.gain;
0.4 => snare.gain;
0.3 => hihat.gain;
0.4 => clap.gain;

// Make sure samples don't play automatically
kick.samples() => kick.pos;
snare.samples() => snare.pos;
hihat.samples() => hihat.pos;
clap.samples() => clap.pos;

// Define patterns (1 = play, 0 = silent)
 @=> int kickPattern;
 @=> int snarePattern;
[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] @=> int hihatPattern;
 @=> int clapPattern;

// Tempo
0.125::second => dur beat;

// Play the sequence
for (0 => int t; t < 4; t++) {
    for (0 => int i; i < 16; i++) {
        // Play the drums
        if (kickPattern[i]) 0 => kick.pos;
        if (snarePattern[i]) 0 => snare.pos;
        if (hihatPattern[i]) 0 => hihat.pos;
        if (clapPattern[i]) 0 => clap.pos;

        // Advance time
        beat => now;
    }
}`;
                        description = "A more complex drum sequencer with patterns";
                    }
                }

                // Default code if no match found
                if (code === "") {
                    code = `// Example not found for ${category}/${name}
// Here's a simple oscillator instead
SinOsc s => dac;
0.5 => s.gain;
440 => s.freq;
2::second => now;`;
                    description = "Requested example not found. Here's a simple oscillator instead.";
                }

                return {
                    contents: [{
                        uri: uri.href,
                        text: `# ChucK Example: ${category}/${name}

${description}

\`\`\`
${code}
\`\`\`

To execute this code, use the executeChucK tool.`
                    }]
                };
            }
        );
   }
}