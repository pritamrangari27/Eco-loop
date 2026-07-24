import requests
import json
import os
from config.settings import OLLAMA_API_URL, MODEL_NAME

def fallback_decision(telemetry):
    pmv = telemetry.get('pmv', 0)
    occ = telemetry.get('occupancy', 0)
    if pmv > 0.5 and occ > 10:
        return {"strategy": "Comfort Priority", "reason": "High PMV and occupancy. Need cooling.", "action": "Increase Cooling"}
    elif pmv < 0 or occ < 5:
        return {"strategy": "Energy Saving", "reason": "Low occupancy or overcooled. Saving energy.", "action": "Reduce Cooling"}
    return {"strategy": "Balanced Mode", "reason": "Conditions are stable.", "action": "Maintain Setpoint"}

def create_mcp_context(telemetry):
    """
    Simulates a Model Context Protocol (MCP) data payload.
    In a full MCP setup, the LLM would request this context via an MCP server.
    Here we package the telemetry as an MCP Resource to transfer to Ollama.
    """
    mcp_payload = {
        "mcp_version": "1.0",
        "type": "resource",
        "resource": {
            "uri": "building://telemetry/current",
            "name": "Current Building Telemetry",
            "content_type": "application/json",
            "data": telemetry
        }
    }
    return json.dumps(mcp_payload, indent=2)

def get_ai_decision(telemetry):
    try:
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prompts', 'system_prompt.txt')
        with open(prompt_path, 'r') as f:
            system_prompt = f.read()

        # Format context via MCP structure
        mcp_context = create_mcp_context(telemetry)

        payload = {
            "model": MODEL_NAME,
            "prompt": f"{system_prompt}\n\n[MCP Context Transfer]\n{mcp_context}\n\nPlease output only JSON.",
            "stream": False,
            "format": "json"
        }
        
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=5)
        if response.status_code == 200:
            result = response.json()
            return json.loads(result.get("response", "{}"))
        else:
            print(f"Ollama error: {response.status_code}")
            return fallback_decision(telemetry)
    except Exception as e:
        print(f"Failed to reach Ollama: {e}")
        return fallback_decision(telemetry)
