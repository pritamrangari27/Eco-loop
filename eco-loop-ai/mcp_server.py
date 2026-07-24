import sqlite3
import json
import os
from mcp.server.fastmcp import FastMCP

# Create a FastMCP server
mcp = FastMCP("EcoLoop Building Management")

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'ecoloop.db')

@mcp.tool()
def get_building_telemetry() -> str:
    """Retrieves the latest building telemetry context from the EcoLoop database."""
    try:
        if not os.path.exists(DB_PATH):
            return json.dumps({"error": "Database not initialized yet."})
            
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM decisions ORDER BY timestamp DESC LIMIT 1')
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return json.dumps(dict(row), indent=2)
        return json.dumps({"error": "No telemetry data available yet."})
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch telemetry: {str(e)}"})

@mcp.tool()
def read_idf_metadata(file_path: str) -> str:
    """Parses an IDF file to extract building metadata without human code modification."""
    try:
        if not os.path.exists(file_path):
            return "File not found."
        with open(file_path, 'r') as f:
            lines = [line.strip() for line in f.readlines()[:50] if line.strip() and not line.startswith('!')]
        return "Parsed IDF Metadata:\n" + "\n".join(lines[:10])
    except Exception as e:
        return f"Error parsing file: {str(e)}"

@mcp.tool()
def get_simulation_errors(file_path: str) -> str:
    """Extracts runtime errors from EnergyPlus simulation error logs (.err files)."""
    try:
        if not os.path.exists(file_path):
            return "No runtime errors found."
        with open(file_path, 'r') as f:
            content = f.read()
            errors = [line for line in content.split('\n') if 'Warning' in line or 'Error' in line]
            return "Extracted Runtime Errors:\n" + "\n".join(errors[-5:]) if errors else "Simulation completed cleanly."
    except Exception as e:
        return f"Failed to extract errors: {str(e)}"

if __name__ == "__main__":
    # Run the server on standard I/O so MCP clients can connect seamlessly
    mcp.run()
