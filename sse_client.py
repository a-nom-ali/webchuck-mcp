# sse_client.py
import asyncio
import httpx
import ssl # Keep ssl import for context creation if needed
import os # If using CA path
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    server_url = "https://localhost:3030/sse"
    print(f"Connecting to SSE server at {server_url}...")

    # --- Create and configure the httpx client FIRST ---

    # Option 1: Disable verification (unsafe, for local dev only)
    # Create an SSL context that doesn't verify certs
    # Note: httpx allows passing verify=False directly too, but using context is explicit.
#     ssl_context = ssl.create_default_context()
#     ssl_context.check_hostname = False
#     ssl_context.verify_mode = ssl.CERT_NONE
#     print("Warning: SSL verification disabled for this client.")

    # Option 2: Use a specific CA bundle (more secure for local dev)
    # Uncomment and use this block instead of Option 1 if you have a local CA
    ca_path = "openssl/cert.pem" # <--- SET THIS CORRECTLY
    if not os.path.exists(ca_path):
        print(f"Error: CA path not found: {ca_path}")
        return
    ssl_context = ssl.create_default_context(cafile=ca_path)
    print(f"Using custom CA for verification: {ca_path}")


    # Create the httpx client, passing the configured SSL context
    async with httpx.AsyncClient(verify=ssl_context) as http_client:

        # --- Pass the configured client to sse_client ---
        # IMPORTANT: The parameter name 'client' here is an *educated guess*.
        # You MUST check the documentation or source code of 'mcp.client.sse.sse_client'
        # to find the correct parameter name for passing a custom httpx client.
        # It could be 'client', 'http_client', 'session', or something else.
        try:
            print("Attempting to pass pre-configured http_client to sse_client...")
            async with sse_client(url=server_url, client=http_client) as streams:
                # Create the client session with the streams
                async with ClientSession(*streams) as session:
                    # Initialize the session
                    await session.initialize()

                    # List available tools
                    response = await session.list_tools()
                    print("Available tools:", [tool.name for tool in response.tools])

                    # Call the greet tool
                    result = await session.call_tool("greet", {"name": "Bob"})
                    print("Greeting result:", result.content)

                    # Call the add tool
                    result = await session.call_tool("add", {"a": 10, "b": 32})
                    print("Addition result:", result.content)
        except TypeError as e:
            # This error likely means 'client' is not the right parameter name
            print(f"\n--- FAILED ---")
            print(f"Passing 'client=http_client' to sse_client resulted in a TypeError: {e}")
            print("This likely means 'client' is not the correct argument name.")
            print("Please check the function signature or documentation for mcp.client.sse.sse_client")
            print("to find how to provide a custom httpx.AsyncClient instance or SSL context.")
            print("-------------")
        except Exception as e:
            print(f"\nAn unexpected error occurred: {e}")
            # Print traceback for other errors
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())