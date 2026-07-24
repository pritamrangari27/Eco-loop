import requests
import json
import os
from config.settings import OLLAMA_API_URL, MODEL_NAME

# Fallback basic agent in case Ollama fails
def fallback_decision(telemetry):
    pmv = telemetry.get('pmv', 0)
    occ = telemetry.get('occupancy', 0)
    if pmv > 0.5 and occ > 10:
        return {"strategy": "Comfort Priority", "reason": "High PMV and occupancy. Need cooling."}
    elif pmv < 0 or occ < 5:
        return {"strategy": "Energy Saving", "reason": "Low occupancy or overcooled. Saving energy."}
    return {"strategy": "Balanced Mode", "reason": "Conditions are stable."}

def get_ai_decision(telemetry):
    try:
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prompts', 'system_prompt.txt')
        with open(prompt_path, 'r') as f:
            system_prompt = f.read()

        payload = {
            "model": MODEL_NAME,
            "prompt": f"{system_prompt}\n\nCurrent Telemetry: {json.dumps(telemetry)}",
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
