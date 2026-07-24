# EcoLoop AI - Architecture Overview

## The Challenge
To build an AI-powered autonomous Building Management System (BMS) that integrates EnergyPlus with an open-source LLM (Qwen2.5) via the Model Context Protocol (MCP), optimizing energy consumption, comfort, and carbon goals.

## System Architecture

EcoLoop relies on a closed-loop system design consisting of the following key components:

### 1. Building Simulator (EnergyPlus)
- **Role**: Simulates building physics, thermal dynamics, and occupancy in real time.
- **Technology**: `pyenergyplus.api` (EnergyPlus Python API).
- **Process**: The system accepts `.epw` (Weather) and `.idf` (Building Model) files, advancing the simulation continuously. At each zone timestep, an API callback intercepts the state, freezing it for analysis.

### 2. Telemetry & Context Engine
- **Role**: Extracts simulation data (Energy, Indoor Temp, Carbon Emissions, Occupancy, Comfort) and stores it synchronously.
- **Technology**: SQLite database for telemetry persistence and historical analytics.

### 3. Model Context Protocol (MCP) Server
- **Role**: Provides a standard, tool-driven interface for LLMs to query the building's context.
- **Technology**: Official Python `mcp` SDK (`FastMCP`).
- **Process**: The server exposes a `get_building_telemetry` tool. When called via standard I/O JSON-RPC, it formats the latest building state and carbon footprint into a structured MCP context payload.

### 4. Autonomous Decision Agent
- **Role**: Acts as the AI brain, reasoning over the MCP context against predefined goals (Energy Savings, Comfort, Carbon Reduction).
- **Technology**: `decision_agent.py` acting as an MCP Client over stdio.
- **Process**: The agent fetches data from the MCP Server and constructs a prompt for the local Qwen2.5 LLM running via Ollama. The LLM analyzes the data and responds with a JSON-formatted HVAC strategy.

### 5. Control & Safety Layer
- **Role**: Actuates physical changes to the HVAC system safely.
- **Technology**: Rule-based validators (`safety/validator.py`) and standard controllers (`controller/hvac_controller.py`).
- **Process**: The LLM's suggested action is verified against hard safety constraints (e.g., maximum temperature deviations) before being sent back into the EnergyPlus simulator to affect the next timestep, closing the loop.

## Data Flow Diagram

```mermaid
graph TD;
    A[EnergyPlus Simulator] -->|pyenergyplus callbacks| B[Telemetry Extraction];
    B -->|sqlite3| C[(EcoLoop Database)];
    C -->|query| D[FastMCP Server];
    E[Decision Agent Client] -->|stdio JSON-RPC| D;
    E -->|Context + Prompt| F[Local LLM - Ollama Qwen2.5];
    F -->|JSON Strategy| G[Safety Validator];
    G -->|Approved Action| H[HVAC Controller];
    H -->|Setpoints| A;
```

## Advanced Strategies

### Prompt Engineering Strategies
The agentic pipeline relies heavily on deterministic JSON enforcement. The `system_prompt.txt` acts as the master instruction set, chaining several techniques:
1. **Role Prompting**: Framing the LLM as an expert HVAC control system manager.
2. **Context Injection**: Pre-loading the prompt with structured telemetry parsed via MCP (including time-series history and constraints).
3. **Structured Output Enforcement**: Explicitly defining a rigid JSON schema (`strategy`, `reason`, `action`) and using function-calling tools to eliminate parsing errors.

### Prompt Latency Management
Executing a local LLM in a real-time control loop introduces processing delays. Latency is managed via:
1. **Asynchronous Hand-offs**: The EnergyPlus callback suspends only the physics timestep while the LLM processes data in an isolated thread, preventing full UI blocks.
2. **Context Truncation**: Limiting the MCP database history query to the latest state vector instead of full time-series logs, reducing input tokens.
3. **Small-Parameter Models**: Using efficient localized models (like Qwen2.5) optimized for short-context tool calling rather than massive, slower foundational models.

### Approach to Handling Lengthy Simulation Logs
EnergyPlus generates massive `.eso` and `.err` files that exceed standard LLM context windows. We bypass this limitation by:
1. **Real-time API Interception**: Instead of parsing post-simulation CSV/ESO files, we tap directly into the active C++ memory space via `pyenergyplus.api` handles.
2. **MCP Tool Abstraction**: For static file reads, we deploy custom FastMCP tools (`read_idf_metadata`, `get_simulation_errors`) that filter and slice lengthy text files down to fewer than 50 relevant lines before injecting them into the LLM context.
3. **Telemetry Database**: We log only structured, down-sampled data points to `ecoloop.db` for the frontend to render efficiently.
