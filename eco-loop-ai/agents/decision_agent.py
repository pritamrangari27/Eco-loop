import requests
import json
import os
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from config.settings import OLLAMA_API_URL, MODEL_NAME
from safety.validator import validate_strategy

def fallback_decision(telemetry):
    pmv = telemetry.get('pmv', 0)
    occ = telemetry.get('occupancy', 0)
    if pmv > 0.5 and occ > 10:
        return {"strategy": "Comfort Priority", "reason": "High PMV and occupancy. Need cooling.", "action": "Increase Cooling"}
    elif pmv < 0 or occ < 5:
        return {"strategy": "Energy Saving", "reason": "Low occupancy or overcooled. Saving energy.", "action": "Reduce Cooling"}
    return {"strategy": "Balanced Mode", "reason": "Conditions are stable.", "action": "Maintain Setpoint"}

async def fetch_mcp_context():
    mcp_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mcp_server.py')
    server_params = StdioServerParameters(command="python", args=[mcp_script], env=os.environ.copy())
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool("get_building_telemetry", arguments={})
                return result.content[0].text
    except Exception as e:
        print(f"MCP Connection Error: {e}")
        return json.dumps({"error": str(e)})

async def execute_mcp_tool(tool_name, arguments):
    mcp_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mcp_server.py')
    server_params = StdioServerParameters(command="python", args=[mcp_script], env=os.environ.copy())
    
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, arguments=arguments)
                return result.content[0].text
    except Exception as e:
        return f"Error executing MCP tool: {str(e)}"

def get_ai_decision(telemetry):
    try:
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prompts', 'system_prompt.txt')
        with open(prompt_path, 'r') as f:
            system_prompt = f.read()

        mcp_context = asyncio.run(fetch_mcp_context())
        if "error" in mcp_context:
            mcp_context = json.dumps(telemetry, indent=2)

        # Build messages for Chat API with Tools
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"[MCP Context Transfer]\n{mcp_context}\n\nPlease analyze the telemetry and execute the appropriate HVAC strategy."}
        ]

        tools = [{
            "type": "function",
            "function": {
                "name": "execute_hvac_action",
                "description": "Executes the chosen HVAC strategy based on telemetry analysis.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "strategy": { "type": "string", "description": "The chosen strategy name." },
                        "reason": { "type": "string", "description": "Reasoning for the strategy." },
                        "action": { "type": "string", "description": "The physical action to take." }
                    },
                    "required": ["strategy", "reason", "action"]
                }
            }
        }, {
            "type": "function",
            "function": {
                "name": "read_idf_metadata",
                "description": "Parses an IDF file to extract building metadata.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": { "type": "string", "description": "Path to the .idf file." }
                    },
                    "required": ["file_path"]
                }
            }
        }, {
            "type": "function",
            "function": {
                "name": "get_simulation_errors",
                "description": "Extracts runtime errors from EnergyPlus simulation error logs (.err files).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": { "type": "string", "description": "Path to the .err file." }
                    },
                    "required": ["file_path"]
                }
            }
        }]

        max_retries = 2
        for attempt in range(max_retries):
            payload = {
                "model": MODEL_NAME,
                "messages": messages,
                "tools": tools,
                "stream": False
            }
            
            # Using /api/chat instead of /api/generate for tool calling support
            chat_url = OLLAMA_API_URL.replace("/api/generate", "/api/chat")
            response = requests.post(chat_url, json=payload, timeout=12)
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message", {})
                
                # Check if the LLM called our tool
                if "tool_calls" in message and len(message["tool_calls"]) > 0:
                    tool_call = message["tool_calls"][0]
                    tool_name = tool_call["function"]["name"]
                    args = tool_call["function"]["arguments"]
                    
                    if tool_name == "execute_hvac_action":
                        # Apply Self-Correction Loop: Validate the tool call!
                        val_res = validate_strategy(args.get("strategy"), telemetry)
                        
                        # If the validator forcefully rejected it (Override)
                        if "rejected" in val_res["action"]:
                            # Feed the error back to the LLM
                            messages.append(message) # Append the assistant's tool call
                            messages.append({
                                "role": "tool",
                                "name": tool_name,
                                "content": f"ERROR: Strategy rejected by safety validator. Reason: {val_res['action']}. Please try a different, safer strategy."
                            })
                            continue # Loop back and let LLM self-correct!
                            
                        # If accepted, return the arguments
                        return args
                    
                    elif tool_name in ["read_idf_metadata", "get_simulation_errors"]:
                        # True Agentic Execution: Execute the file-parsing MCP tool
                        mcp_result = asyncio.run(execute_mcp_tool(tool_name, args))
                        messages.append(message)
                        messages.append({
                            "role": "tool",
                            "name": tool_name,
                            "content": mcp_result
                        })
                        continue # Loop back so the LLM can read the file and then call execute_hvac_action

                # If no tool calls were made or parsing failed, fallback
                return fallback_decision(telemetry)
            else:
                print(f"Ollama error: {response.status_code}")
                return fallback_decision(telemetry)
                
        return fallback_decision(telemetry)
    except Exception as e:
        print(f"Failed to reach Ollama: {e}")
        return fallback_decision(telemetry)
