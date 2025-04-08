# WebChucK MCP User Guide

This guide will help you get started with WebChucK MCP, an AI-enhanced audio programming environment that combines the power of WebChucK with the Model Context Protocol (MCP) for seamless AI integration.

## Table of Contents

1. [Introduction](#introduction)
2. [Interface Overview](#interface-overview)
3. [Basic Usage](#basic-usage)
4. [Working with Samples](#working-with-samples)
5. [Managing Audio Samples](#managing-audio-samples)
6. [Using the Code Library](#using-the-code-library)
7. [Parameter Controls](#parameter-controls)
8. [Audio Visualization](#audio-visualization)
9. [Theme Management](#theme-management)
10. [AI Integration](#ai-integration)
11. [Troubleshooting](#troubleshooting)

## Introduction

WebChucK MCP combines the versatile WebChucK audio programming environment with AI capabilities through the Model Context Protocol (MCP). This enables AI assistants to create, manipulate, and execute ChucK code directly, providing an accessible interface for complex audio synthesis and manipulation.

The application serves as an intermediary between AI assistants and the WebChucK engine, allowing for seamless audio programming, sample loading, and sample management, all while providing immediate audio feedback and visualization.

## Interface Overview

The WebChucK MCP interface is divided into several functional sections:

- **Connection Status**: Shows the current connection status to WebChucK and the server
- **ChucK Code Editor**: Where ChucK code is written and executed
- **Parameter Controls**: Dynamic controls for real-time parameter adjustment
- **Audio Visualization**: Displays waveform, spectrum, and level meters
- **Sample Preloader**: For loading sample families
- **Sample Library**: For managing audio samples
- **Example Programs**: Quick access to example ChucK programs
- **Code Library**: For saving and loading code snippets
- **Console Output**: Displays execution logs and messages

## Basic Usage

### Starting WebChucK

1. Launch the application
2. Click the "Start WebChucK" button
3. Once connected, click "Connect to Server" to enable server features
4. You can optionally set a session name for identification

### Running Code

1. Enter ChucK code in the editor (or load an example)
2. Click "Run Code" to execute
3. Use "Stop" to halt execution
4. Use "Save Audio" to save the current audio output

### Example Code

```chuck
// Simple sine wave oscillator
SinOsc s => dac;
0.5 => s.gain;
220 => s.freq;
2::second => now;
```

## Working with Samples

WebChucK MCP allows you to preload sample samples for use in your code:

1. Select one or more sample families in the Sample Preloader section
2. Click "Preload Selected Samples"
3. Wait for preloading to complete
4. Use the preloaded samples in your code by referencing their paths

Example code using a preloaded piano:

```chuck
SndBuf piano => dac;
"audio_files/acoustic_grand_piano/C4.wav" => piano.read;
0.5 => piano.gain;
piano.play();
2::second => now;
```

## Managing Audio Samples

### Loading Samples

1. Click "Load All Samples" to view available samples
2. Use the search to filter samples
3. Click on a sample to generate code for it

### Uploading Samples

1. Select a file using the file input
2. Click "Upload" to upload it to the server

### Recording Samples

1. Enter a name for your recording
2. Click "Record (5s)" to capture 5 seconds of audio
3. The recording will automatically upload to the server

## Using the Code Library

The Code Library allows you to save and reuse code snippets:

### Saving Code

1. Enter code in the editor
2. Click "Save Current Code"
3. Enter a name for the snippet

### Loading Code

1. Select a saved snippet from the list
2. Click "Load Selected"

### Deleting Code

1. Select a saved snippet from the list
2. Click "Delete Selected"
3. Confirm deletion

## Parameter Controls

WebChucK MCP supports real-time parameter adjustment through special annotations in your code:

```chuck
// @param float values between 0 and 1
// @range 0.1 1.0
float gain = 0.5;

// @param int values for frequency
// @range 110 880
int freq = 440;
```

When you run code with these annotations:

1. Parameter controls are automatically generated in the UI
2. You can adjust the parameters in real-time using sliders
3. The changes are immediately reflected in the running ChucK code

## Audio Visualization

WebChucK MCP provides three types of audio visualization:

1. **Waveform**: Shows the time-domain representation of the audio signal
2. **Spectrum**: Displays the frequency spectrum using FFT analysis
3. **Level Meter**: Shows the current audio level

These visualizations update in real-time while your code is running.

## Theme Management

WebChucK MCP supports both light and dark themes:

1. Use the theme toggle in the upper right to switch between themes
2. The application will remember your preference
3. By default, it follows your system preference

## AI Integration

WebChucK MCP can be used with AI assistants that support the Model Context Protocol (MCP):

1. The AI can execute ChucK code using the `executeChucK` tool
2. It can preload samples using the `preloadSamples` tool
3. It can retrieve debug information using the `debugSessions` tool
4. The AI can get the current code using the `getCodeFromEditor` tool

For integration details, see the [AI Integration Guide](./ai-integration.md).

## Troubleshooting

### Common Issues

#### WebChucK Won't Connect

- Ensure your browser supports WebAudio
- Check for console errors in the browser developer tools
- Try refreshing the page and reconnecting

#### Sound Not Working

- Check if your browser's audio is muted
- Ensure your system volume is up
- Try clicking somewhere on the page (browsers require user interaction before playing audio)

#### Server Connection Issues

- Verify the server is running
- Check network connectivity
- Look for errors in the console output

For more troubleshooting help, see [Troubleshooting](./troubleshooting.md).
