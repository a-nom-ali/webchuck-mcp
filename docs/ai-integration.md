# AI Integration Guide for WebChucK MCP

This guide explains how to use WebChucK MCP with AI assistants through the Model Context Protocol (MCP). It covers the available MCP tools, their usage, and best practices for AI-generated ChucK code.

## Table of Contents

1. [Introduction](#introduction)
2. [Available MCP Tools](#available-mcp-tools)
3. [Tool Usage Examples](#tool-usage-examples)
4. [ChucK Coding Guidelines for AI](#chuck-coding-guidelines-for-ai)
5. [Parameter Controls](#parameter-controls)
6. [Working with Samples](#working-with-samples)
7. [Error Handling](#error-handling)
8. [Advanced Usage](#advanced-usage)

## Introduction

WebChucK MCP enables AI assistants to control and interact with the WebChucK audio programming environment through a standardized interface called the Model Context Protocol (MCP). This allows AI assistants to:

- Execute ChucK code
- Preload audio samples and samples
- Retrieve debug information
- Access the current editor code
- Manage audio resources

## Available MCP Tools

WebChucK MCP exposes the following tools through the MCP interface:

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `executeChucK` | Executes ChucK code in a WebChucK session | `code`, `sessionId` |
| `stopChucK` | Stops the execution of a ChucK session | `sessionId` |
| `listAudioFiles` | Lists available audio files for preloading | (optional) `query` |
| `getChucKSessions` | Lists active WebChucK sessions | none |
| `preloadSamples` | Preloads specified sample samples | `samples`, `sessionId` |
| `playWithSamples` | Combines preloading and code execution | `code`, `samples`, `sessionId` |
| `debugExecutions` | Shows detailed execution results | `sessionId` |
| `debugPreload` | Shows detailed preloading results | `sessionId` |
| `debugSessions` | Shows general session information | none |
| `getCodeFromEditor` | Retrieves current code from the editor | none |

## Tool Usage Examples

### Getting Active Sessions

First, always get the active session ID:

```
To work with WebChucK, I need to get the active sessions.

Tool: getChucKSessions
```

Example response:
```
Active WebChucK sessions: 1
abc123-def456-789
```

### Executing ChucK Code

```
Let me create a simple sine wave oscillator.

Tool: executeChucK
Parameters:
{
  "code": "// Simple sine wave\nSinOsc s => dac;\n0.5 => s.gain;\n440 => s.freq;\n2::second => now;",
  "sessionId": "abc123-def456-789"
}
```

### Preloading Samples

```
Let's preload some piano samples for our composition.

Tool: preloadSamples
Parameters:
{
  "samples": ["acoustic_grand_piano"],
  "sessionId": "abc123-def456-789"
}
```

### Checking for Errors

```
Let's check if our code execution had any errors.

Tool: debugExecutions
Parameters:
{
  "sessionId": "abc123-def456-789"
}
```

### Retrieving Current Code

```
Let me see what code is currently in the editor.

Tool: getCodeFromEditor
```

## ChucK Coding Guidelines for AI

When generating ChucK code for WebChucK MCP, follow these guidelines:

### Syntax Essentials

- ChucK uses `=>` for audio routing and assignment (NOT typical `=` for assignment)
- Time is managed with the `::` operator (e.g., `1::second => now;`)
- Reference audio files with relative paths from the preloaded samples

### Common Patterns

1. **Basic Oscillator**
   ```chuck
   SinOsc s => dac;
   0.5 => s.gain;
   440 => s.freq;
   2::second => now;
   ```

2. **Effect Chain**
   ```chuck
   SinOsc s => JCRev rev => dac;
   0.5 => s.gain;
   440 => s.freq;
   0.1 => rev.mix;
   2::second => now;
   ```

3. **Sample Playback**
   ```chuck
   SndBuf buf => dac;
   "audio_files/kick.wav" => buf.read;
   0.5 => buf.gain;
   0 => buf.pos; // Reset position to start
   buf.length() => now; // Wait for sample to finish
   ```

### Avoiding Common Errors

- Always use `=>` for assignment, not `=`
- Include `=> now;` to advance time
- Ensure audio connections form a complete path to `dac` (digital-audio-converter)
- Reset sample position with `0 => buf.pos;` before playback
- Use relative paths starting with `audio_files/` for samples
- Add proper error handling for file operations

## Parameter Controls

You can create dynamic UI controls by adding special annotations to your code:

```chuck
// @param float values between 0 and 1
// @range 0.1 1.0
float gain = 0.5;

// @param int values for frequency
// @range 110 880
int freq = 440;

// Main loop to update values
while (true) {
    // These values will be updated from UI controls
    gain => osc.gain;
    freq => osc.freq;
    10::ms => now;
}
```

The annotation format:
- `// @param type description` marks a parameter
- `// @range min max` sets the control range
- Supported types: `float`, `int`, `dur`

## Working with Samples

### Finding Available Samples

Use the `listAudioFiles` tool to discover available samples:

```
Tool: listAudioFiles
```

For specific sample types:

```
Tool: listAudioFiles
Parameters:
{
  "query": "piano"
}
```

### Using Samples in Code

After preloading:

```chuck
// Use the exact paths from preloading results
SndBuf piano => dac;
"audio_files/acoustic_grand_piano/C4.wav" => piano.read;
0.5 => piano.gain;
0 => piano.pos; // Reset position
piano.length() => now; // Play for the full duration
```

## Error Handling

Always check for errors after execution:

```
Tool: debugExecutions
Parameters:
{
  "sessionId": "abc123-def456-789"
}
```

Common errors and solutions:

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `NullPointerException` | Accessing uninitialized object | Ensure objects are created before use |
| `FileNotFound` | Invalid file path | Check file paths from `listAudioFiles` |
| `UGen DAC not connected` | Incomplete audio path | Ensure signal path leads to `dac` |
| `Invalid syntax` | ChucK syntax error | Check for missing semicolons, brackets, etc. |

## Advanced Usage

### Creating Complex Compositions

For complex compositions, use the following pattern:

1. Get active session
2. Check available samples
3. Preload required samples
4. Verify preloading was successful
5. Execute code with proper error handling
6. Debug any issues

Example workflow:

```
1. Tool: getChucKSessions
2. Tool: listAudioFiles
   Parameters: { "query": "piano" }
3. Tool: preloadSamples
   Parameters: { "samples": ["piano", "drums"], "sessionId": "abc123" }
4. Tool: debugPreload
   Parameters: { "sessionId": "abc123" }
5. Tool: executeChucK
   Parameters: { "code": "...", "sessionId": "abc123" }
6. Tool: debugExecutions
   Parameters: { "sessionId": "abc123" }
```

### Adding Interactive Controls

For interactive compositions:

1. Use parameter annotations to create controls
2. Use a continuous loop to update parameters
3. Provide a clear stopping mechanism

Example:

```chuck
// @param float master volume
// @range 0.0 1.0
float masterVolume = 0.5;

// @param int tempo in BPM
// @range 60 180
int tempo = 120;

// Calculate beat duration
60.0 / tempo => float beatSec;
beatSec::second => dur beat;

// Audio setup
SinOsc osc => dac;
masterVolume => dac.gain();

// Main loop
while (true) {
    // These will be updated from UI controls
    Std.mtof(60 + Math.random2(0, 12)) => osc.freq;
    beat => now;
}
```

This will create sliders for volume and tempo that users can adjust in real-time.
