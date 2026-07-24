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

if __name__ == "__main__":
    # Run the server on standard I/O so MCP clients can connect seamlessly
    mcp.run()
