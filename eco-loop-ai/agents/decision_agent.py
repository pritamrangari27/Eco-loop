import requests
import json
import os
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from config.settings import OLLAMA_API_URL, MODEL_NAME

def fallback_decision(telemetry):
    pmv = telemetry.get('pmv', 0)
    occ = telemetry.get('occupancy', 0)
    if pmv > 0.5 and occ > 10:
        return {"strategy": "Comfort Priority", "reason": "High PMV and occupancy. Need cooling.", "action": "Increase Cooling"}
    elif pmv < 0 or occ < 5:
        return {"strategy": "Energy Saving", "reason": "Low occupancy or overcooled. Saving energy.", "action": "Reduce Cooling"}
    return {"strategy": "Balanced Mode", "reason": "Conditions are stable.", "action": "Maintain Setpoint"}

async def fetch_mcp_context():
    """
    Connects to the true MCP server via stdio and invokes the get_building_telemetry tool.
    This fulfills the hackathon requirement of integrating via Model Context Protocol (MCP).
    """
    mcp_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mcp_server.py')
    
    server_params = StdioServerParameters(
        command="python",
        args=[mcp_script],
        env=os.environ.copy()
    )
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                # Call the tool exposed by the FastMCP server
                result = await session.call_tool("get_building_telemetry", arguments={})
                return result.content[0].text
    except Exception as e:
        print(f"MCP Connection Error: {e}")
        return json.dumps({"error": str(e)})

def get_ai_decision(telemetry):
    try:
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prompts', 'system_prompt.txt')
        with open(prompt_path, 'r') as f:
            system_prompt = f.read()

        # Query the MCP server for the context
        mcp_context = asyncio.run(fetch_mcp_context())
        
        # Fallback to direct telemetry if DB/MCP failed
        if "error" in mcp_context:
            mcp_context = json.dumps(telemetry, indent=2)

        payload = {
            "model": MODEL_NAME,
            "prompt": f"{system_prompt}\n\n[MCP Context Transfer]\n{mcp_context}\n\nPlease output only JSON.",
            "stream": False,
            "format": "json"
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=8)
        if response.status_code == 200:
            result = response.json()
            return json.loads(result.get("response", "{}"))
        else:
            print(f"Ollama error: {response.status_code}")
            return fallback_decision(telemetry)
    except Exception as e:
        print(f"Failed to reach Ollama: {e}")
        return fallback_decision(telemetry)
