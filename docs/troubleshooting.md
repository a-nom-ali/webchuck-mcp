# WebChucK MCP Troubleshooting Guide

This guide helps you diagnose and fix common issues with WebChucK MCP.

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Audio Problems](#audio-problems)
3. [Code Execution Issues](#code-execution-issues)
4. [Sample and Sample Issues](#sample-and-sample-issues)
5. [UI and Visualization Issues](#ui-and-visualization-issues)
6. [AI Integration Problems](#ai-integration-problems)
7. [Performance Concerns](#performance-concerns)
8. [Log File Locations](#log-file-locations)

## Connection Issues

### WebChucK Won't Connect

**Symptoms:**
- "Start WebChucK" button doesn't change state
- Error in console about WebChucK initialization
- Connection status remains at "Not connected"

**Possible Solutions:**
1. **Browser Compatibility**: Ensure you're using a modern browser with WebAudio support (Chrome, Firefox, Edge)
2. **Refresh the Page**: Sometimes a simple refresh resolves initialization issues
3. **Check Console**: Look for specific error messages in browser developer tools (F12)
4. **Clear Cache**: Clear browser cache and reload the page
5. **Audio Context**: Some browsers require user interaction before allowing audio - click anywhere on the page

### Server Connection Failed

**Symptoms:**
- "Connect to Server" doesn't work
- Error in console about WebSocket connection
- Sample list doesn't populate

**Possible Solutions:**
1. **Server Running**: Verify the server is running on the expected port
2. **Network Issues**: Check for network connectivity problems
3. **Firewall Settings**: Ensure your firewall allows WebSocket connections
4. **Correct URL**: Verify the server URL in config.js is correct
5. **Try Different Port**: If there's a port conflict, configure the server to use a different port

## Audio Problems

### No Sound

**Symptoms:**
- Code runs without errors but no sound is heard
- Console shows successful execution

**Possible Solutions:**
1. **System Volume**: Check your system volume and ensure it's not muted
2. **Browser Volume**: Check browser-specific volume controls
3. **Audio Routing**: Ensure your code connects to `dac` (digital-audio-converter)
4. **Gain Settings**: Check if gain/volume is set too low in your code
5. **Timing Issues**: Ensure your code includes `=> now;` to advance time
6. **Audio Output Device**: Check if the correct audio output device is selected in your system

### Distorted Sound

**Symptoms:**
- Audio plays but sounds distorted or clipped
- Crackling or popping sounds

**Possible Solutions:**
1. **Gain Too High**: Reduce gain values in your code (e.g., `0.3 => osc.gain;`)
2. **Multiple Sources**: Too many sound sources without volume adjustment
3. **Buffer Size**: Try a larger buffer size if available
4. **CPU Load**: Close other applications using audio or CPU resources

## Code Execution Issues

### Code Won't Run

**Symptoms:**
- Clicking "Run Code" does nothing
- Error message in console

**Possible Solutions:**
1. **Syntax Errors**: Check your ChucK code for syntax errors
2. **Connection Status**: Ensure WebChucK is connected first
3. **Previous Execution**: Stop any running code before executing new code
4. **Console Errors**: Check console output for specific error messages

### Runtime Errors

**Symptoms:**
- Code starts but stops with an error
- Unexpected behavior or silence

**Common ChucK Errors:**

| Error | Common Cause | Solution |
|-------|--------------|----------|
| `NullPointerException` | Using an object before initialization | Ensure objects are created before use |
| `FileNotFoundException` | Sample file not found | Verify file paths and preload samples |
| `TypeError` | Incorrect variable type | Check variable types and conversions |
| `Time Error` | Issues with timing operations | Verify time syntax (e.g., `2::second`) |
| `UGen Exception` | Audio routing problems | Check your audio routing path to `dac` |

## Sample and Sample Issues

### Samples Not Loading

**Symptoms:**
- `FileNotFoundException` in console
- Silent playback when using samples
- "Preload failed" messages

**Possible Solutions:**
1. **Correct Paths**: Ensure you're using the exact path returned by the preload function
2. **Preload First**: Always preload samples before attempting to use them
3. **Check Debug Info**: Use the debugPreload tool to verify which files actually loaded
4. **File Format**: Ensure the sample files are in a supported format (WAV, AIFF)
5. **Filename Issues**: If filenames contain special characters, try renaming them

### Sample Preloading Failures

**Symptoms:**
- Error messages during preload
- Samples don't appear in the preload status

**Possible Solutions:**
1. **Server Connectivity**: Ensure server connection is active
2. **Sample Selection**: Verify that samples exist on the server
3. **Console Errors**: Check for specific error messages during preload
4. **Preload Limit**: You may be exceeding the maximum number of files that can be preloaded
5. **File Paths**: Ensure the server has correct file paths configured

## UI and Visualization Issues

### Parameter Controls Not Appearing

**Symptoms:**
- No parameter sliders appear when running code with variables
- Parameter controls container shows "No controllable parameters"

**Possible Solutions:**
1. **Comment Format**: Ensure you're using the correct comment format (`// @param type` followed by variable declaration)
2. **Global Variables**: Only global variables can be controlled (not inside functions)
3. **Variable Types**: Ensure you're using supported variable types (float, int, dur)
4. **UI Container**: Check if the parameter controls container exists in the DOM
5. **Code Structure**: Check if the code is structured correctly for parameter detection

### Visualizations Not Working

**Symptoms:**
- No waveforms or spectrum display when audio is playing
- Blank or static visualizer canvases

**Possible Solutions:**
1. **Audio Connection**: Ensure audio is properly routed to the analyzer node
2. **Canvas Elements**: Verify that canvas elements exist and have correct dimensions
3. **Browser Support**: Check if your browser supports the Web Audio API fully
4. **Audio Output**: Confirm audio is actually playing (check system volume)
5. **Animation Loop**: The animation frame might be canceled or not started

### Dark Mode Issues

**Symptoms:**
- Theme toggle doesn't work
- Colors don't change when toggling theme
- Inconsistent theme application

**Possible Solutions:**
1. **Local Storage**: Clear browser's local storage to reset theme preference
2. **CSS Variables**: Ensure CSS variables are properly defined for both themes
3. **Browser Compatibility**: Some older browsers don't support CSS variables
4. **DOM Attributes**: Check if the data-theme attribute is properly set on the HTML element
5. **Media Query**: Ensure the prefers-color-scheme media query is properly implemented

## AI Integration Problems

### Tool Not Found by Claude

**Symptoms:**
- Claude reports "tool not found" when trying to use a WebChucK tool
- MCP tools don't appear in Claude's interface

**Possible Solutions:**
1. **Server Connection**: Ensure the server is running and connected to Claude
2. **Tool Registration**: Verify the tool is properly registered in the server
3. **Claude Configuration**: Check if Claude's configuration includes the WebChucK MCP server
4. **Connection Timeout**: Try reconnecting the server to Claude
5. **Server Errors**: Check server logs for errors related to tool registration

### Code Generation Issues

**Symptoms:**
- Claude generates incorrect ChucK code
- Syntax errors in AI-generated code

**Possible Solutions:**
1. **Clearer Instructions**: Provide more specific instructions to Claude about ChucK syntax
2. **Example Code**: Share example ChucK code to help Claude understand the syntax
3. **Prompt Engineering**: Use the webchuck_syntax_reminder prompt for better code generation
4. **Incremental Development**: Ask for smaller code snippets rather than full programs
5. **Manual Editing**: Check and correct AI-generated code before running

## Performance Concerns

### Browser Slowdowns

**Symptoms:**
- Browser becomes sluggish when running ChucK code
- High CPU usage
- Delayed responses to user input

**Possible Solutions:**
1. **Simplify Code**: Reduce complexity of ChucK code (fewer oscillators, simpler algorithms)
2. **Console Output**: Limit console output volume (avoid large or frequent prints)
3. **Browser Resources**: Close other tabs and applications
4. **Visualizer Usage**: Disable visualizers if they're causing performance issues
5. **Memory Leaks**: Stop and restart code periodically for long sessions

### Audio Latency

**Symptoms:**
- Noticeable delay between code execution and sound
- Inconsistent timing in rhythmic patterns

**Possible Solutions:**
1. **Buffer Size**: Try adjusting the audio buffer size if available
2. **Latency Hint**: Set `theChuck.latencyHint` to a lower value (e.g., 0.1)
3. **Background Processes**: Close other audio applications
4. **Browser Audio**: Some browsers have better audio performance than others
5. **Code Optimization**: Simplify audio chains and processing

## Log File Locations

### Server Logs

Server logs are stored in the following locations:

- **WebChucK Server**: `./logs/webchuck-server.log`
- **MCP Server**: `./logs/mcp-server.log`
- **Error Logs**: `./logs/error.log`

### Client-side Logging

Client-side logs can be accessed through:

1. **Browser Console**: Press F12 to open developer tools, then select the "Console" tab
2. **Console Output**: The console output area in the WebChucK MCP interface
3. **Local Storage**: Some debug information is stored in browser localStorage

### Viewing Extended Logs

For more detailed logging:

1. Add `?debug=true` to the URL to enable verbose console logging
2. Use the `debugSessions`, `debugExecutions`, and `debugPreload` tools in MCP
3. Check network requests in browser developer tools for API call details

## Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `ECONNREFUSED` | Server connection refused | Check if server is running on the correct port |
| `WebSocket Error` | WebSocket connection failure | Check network connectivity and server status |
| `Audio Context Error` | Browser audio context issues | User interaction required to initialize audio |
| `404 Not Found` | Resource or API endpoint not found | Check file paths and API URLs |
| `500 Internal Server Error` | Server-side error | Check server logs for detailed information |

---

If you're still experiencing issues after trying these solutions, please:

1. Take a screenshot of any error messages
2. Note the steps to reproduce the issue
3. Check the browser console (F12) for additional error information
4. Share these details with the development team for further assistance
