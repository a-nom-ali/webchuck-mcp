#!/usr/bin/env python3
"""WebChucK integration through the Model Context Protocol."""

import argparse
import asyncio
import json
import logging
import socket
import sys
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, List, Optional
from mcp.server.fastmcp import Context, FastMCP

__version__ = "1.0.0"
AUDIO_DIR = os.path.join(os.path.realpath(__file__), 'audio_files')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("webchuck-mcp")


@dataclass
class WebChucKConnection:
    host: str
    port: int
    sock: socket.socket = None

    def connect(self) -> bool:
        """Connect to the WebChucK plugin socket server"""
        if self.sock:
            return True

        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.connect((self.host, self.port))
            logger.info(f"Connected to WebChucK at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to WebChucK: {str(e)}")
            self.sock = None
            return False

    def disconnect(self):
        """Disconnect from the WebChucK plugin"""
        if self.sock:
            try:
                self.sock.close()
            except Exception as e:
                logger.error(f"Error disconnecting from WebChucK: {str(e)}")
            finally:
                self.sock = None

    def receive_full_response(self, sock, buffer_size=8192):
        """Receive the complete response, potentially in multiple chunks"""
        chunks = []
        sock.settimeout(15.0)

        try:
            while True:
                try:
                    chunk = sock.recv(buffer_size)
                    if not chunk:
                        if not chunks:
                            raise Exception("Connection closed before receiving any data")
                        break

                    chunks.append(chunk)

                    # Check if we've received a complete JSON object
                    try:
                        data = b''.join(chunks)
                        json.loads(data.decode('utf-8'))
                        logger.info(f"Received complete response ({len(data)} bytes)")
                        return data
                    except json.JSONDecodeError:
                        # Incomplete JSON, continue receiving
                        continue
                except socket.timeout:
                    logger.warning("Socket timeout during chunked receive")
                    break
                except (ConnectionError, BrokenPipeError, ConnectionResetError) as e:
                    logger.error(f"Socket connection error during receive: {str(e)}")
                    raise
        except socket.timeout:
            logger.warning("Socket timeout during chunked receive")
        except Exception as e:
            logger.error(f"Error during receive: {str(e)}")
            raise

        # If we get here, we either timed out or broke out of the loop
        if chunks:
            data = b''.join(chunks)
            logger.info(f"Returning data after receive completion ({len(data)} bytes)")
            try:
                json.loads(data.decode('utf-8'))
                return data
            except json.JSONDecodeError:
                raise Exception("Incomplete JSON response received")
        else:
            raise Exception("No data received")

    def send_command(self, command_type: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a command to WebChucK and return the response"""
        if not self.sock and not self.connect():
            raise ConnectionError("Not connected to WebChucK")

        command = {
            "type": command_type,
            "parameters": json.dumps(params or {})
        }

        try:
            logger.info(f"Sending command: {command_type} with params: {params}")

            self.sock.sendall(json.dumps(command).encode('utf-8'))
            logger.info(f"Command sent, waiting for response...")

            self.sock.settimeout(15.0)

            response_data = self.receive_full_response(self.sock)
            logger.info(f"Received {len(response_data)} bytes of data")
            logger.info(response_data.decode('utf-8'))

            response = json.loads(response_data.decode('utf-8'))
            logger.info(f"Response parsed, status: {response.get('success', 'unknown')}")

            if not response.get("success"):
                logger.error(f"WebChucK error: {response.get('error')}")
                raise Exception(response.get("error", "Unknown error from WebChucK"))

            return response.get("data", {})
        except socket.timeout:
            logger.error("Socket timeout while waiting for response from WebChucK")
            self.sock = None
            raise Exception("Timeout waiting for WebChucK response - try simplifying your request")
        except (ConnectionError, BrokenPipeError, ConnectionResetError) as e:
            logger.error(f"Socket connection error: {str(e)}")
            self.sock = None
            raise Exception(f"Connection to WebChucK lost: {str(e)}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response from WebChucK: {str(e)}")
            if 'response_data' in locals() and response_data:
                logger.error(f"Raw response (first 200 bytes): {response_data[:200]}")
            raise Exception(f"Invalid response from WebChucK: {str(e)}")
        except Exception as e:
            logger.error(f"Error communicating with WebChucK: {str(e)}")
            self.sock = None
            raise Exception(f"Communication error with WebChucK: {str(e)}")


# Global connection instance
_webchuck_connection = None


def get_webchuck_connection():
    """Get or create a connection to WebChucK"""
    global _webchuck_connection

    if _webchuck_connection is None:
        _webchuck_connection = WebChucKConnection(host="localhost", port=3030)

    # Try to connect if not already connected
    if not _webchuck_connection.connect():
        # If connection fails, create a new connection and try again
        _webchuck_connection = WebChucKConnection(host="localhost", port=3030)
        if not _webchuck_connection.connect():
            raise ConnectionError("Failed to connect to WebChucK")

    return _webchuck_connection


@asynccontextmanager
async def server_lifespan(server: FastMCP) -> AsyncIterator[Dict[str, Any]]:
    """Lifecycle manager for the MCP server"""
    # Setup phase
    logger.info("Starting WebChucK MCP server")

    # Try to establish a connection to WebChucK
    try:
        connection = get_webchuck_connection()
        logger.info("Connected to WebChucK successfully")
    except Exception as e:
        logger.warning(f"Could not connect to WebChucK at startup: {str(e)}")
        logger.warning("Will try to connect when commands are received")

    try:
        yield {"status": "running"}
    finally:
        # Cleanup phase
        logger.info("Shutting down WebChucK MCP server")

        # Disconnect from WebChucK
        if _webchuck_connection:
            _webchuck_connection.disconnect()


# MCP Tools
# Create the MCP server with lifespan support
mcp = FastMCP(
    title="WebChucK MCP",
    description="WebChucK integration through the Model Context Protocol",
    version=__version__,
    lifespan=server_lifespan,
)


@mcp.tool()
def execute_code(ctx: Context, code: str) -> str:
    """Execute ChucK code in the WebChucK system.

    Args:
        code: The ChucK code to execute

    Returns:
        A JSON string containing information about the code execution.
    """
    try:
        connection = get_webchuck_connection()
        result = connection.send_command("code.Execute", code)
        return json.dumps(result)
    except Exception as e:
        return f"Error getting system info: {str(e)}"


@mcp.tool()
def stop_execution(ctx: Context) -> str:
    """Stops the execution of the current WebChucK session.

    Returns:
        A JSON string containing information about the stop execution success.
    """
    try:
        connection = get_webchuck_connection()
        result = connection.send_command("code.Stop")
        return json.dumps(result)
    except Exception as e:
        return f"Error stopping execution."


@mcp.tool()
def list_audio_files(ctx: Context) -> str:
    """Get a list of the audio files available to use in the code.

    Returns:
        A JSON string containing information about the audio files available.
    """
    try:
        connection = get_webchuck_connection()
        result = connection.send_command("audio.List")
        return json.dumps(result)
    except Exception as e:
        return f"Error getting object info: {str(e)}"


# @mcp.resource("audio_exists://{filename}")
# def audio_exists(filename: str) -> str:
#     """Check if an audio file exists"""
#     return { "exists": os.path.exists(os.path.join(AUDIO_DIR, filename))}


@mcp.prompt()
def webchuck_assistant_guide() -> str:
    """Provides guidance on using the AI assistant features in WebChucK."""
    return """
    # WebChucK MCP Assistant Guide

    The WebChucK MCP system includes an AI assistant that can help you with your music and audio development process. Here's how to use it:

    ## Executing Code

    Use the `execute_code` tool to execute ChucK in WebChucK

    ## Stop Code Execution

    Use the `stop_execution` tool to stop any ChucK code that might currently be running in WebChucK

    ## Working with the Assistant

    1. Start by getting insights about your task
    2. Ask for specific suggestions based on the insights
    3. Implement the suggestions using the WebChucK MCP tools
    4. Get new insights to see how your changes have improved the sound

    The assistant works best when you provide specific context about what you're trying to achieve. For example, instead of asking for general suggestions, ask for suggestions about a specific aspect of your audio journey.

    Remember that the assistant is a tool to enhance your creativity, not replace it. Use its suggestions as inspiration for your own ideas.
    """


def main():
    """Main entry point for the WebChucK MCP server."""
    parser = argparse.ArgumentParser(description="WebChucK MCP Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind the server to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind the server to")
    parser.add_argument("--webchuck-host", default="localhost", help="WebChucK host to connect to")
    parser.add_argument("--webchuck-port", type=int, default=3030, help="WebChucK port to connect to")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    if args.debug:
        logger.setLevel(logging.DEBUG)

    # Set the global connection parameters
    global _webchuck_connection
    _webchuck_connection = WebChucKConnection(host=args.webchuck_host, port=args.webchuck_port)

    # Run the server
    mcp.run()


if __name__ == "__main__":
    main()