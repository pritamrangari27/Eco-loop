# Eco-Loop AI

Eco-Loop AI is an autonomous, physical AI proof-of-concept that dynamically manages building operations to optimize energy consumption while maintaining occupant comfort.

By integrating the high-fidelity **EnergyPlus** simulation engine with an **Open-Source LLM** (Qwen 2.5 via Ollama) and a **Model Context Protocol (MCP)** tool-calling framework, Eco-Loop creates a self-correcting, closed-loop pipeline for building management.

---

## Hackathon Objectives Met
- **Closed-Loop Execution:** Streams live performance metrics (temperatures, IAQ, PMV) from EnergyPlus to the LLM, evaluating them against dynamic targets, and executing safe HVAC setpoint overrides automatically.
- **Cognitive Agent & MCP Integration:** Utilizes local LLMs capable of tool-calling to extract simulation metadata and dynamically adjust parameters without human code modification.
- **Quantitative Savings Dashboard:** Features a responsive, modern UI comparing baseline energy consumption against AI-optimized strategies, calculating net-reductions in kWh.
- **Safety & Fallback Mechanisms:** A validation layer ensuring the LLM's decisions maintain thermal comfort and never breach hard safety constraints.

## System Architecture

```mermaid
graph TD
    subgraph Simulation
        EP[EnergyPlus Engine]
        SIM[simulator.py Wrapper]
        EP <-->|Timestep Callbacks| SIM
    end

    subgraph Intelligence
        OLLAMA[Ollama: Qwen 2.5]
        AGENT[decision_agent.py]
        MCP[mcp_server.py]
        AGENT <-->|Prompts & Tool Calls| OLLAMA
        AGENT <-->|File Parsing / Logs| MCP
    end

    subgraph Control Loop
        APP[app.py Main Loop]
        VAL[safety/validator.py]
        DB[(SQLite Database)]
        DASH[Flask Dashboard UI]
    end

    SIM -->|Raw Telemetry| APP
    APP -->|State Context| AGENT
    AGENT -->|Proposed Strategy| VAL
    VAL -->|Safe Actuation| SIM
    VAL -->|Metrics & Decisions| DB
    DB -->|History API| DASH
```


- 

## 🚀 Getting Started

### Prerequisites
1. **Python 3.10+**
2. **EnergyPlus:** Ensure EnergyPlus is installed locally. 
   *(Note: Update the `ep_path` in `energyplus/simulator.py` to match your installation path, e.g., `C:\EnergyPlusV24-1-0`)*
3. **Ollama:** Install Ollama and pull the required model:
   ```bash
   ollama pull qwen2.5:1.5b
   ```

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pritamrangari27/Eco-loop.git
   cd Eco-loop/eco-loop-ai
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the System
Start the main application and dashboard loop:
```bash
python app.py
```
Open your browser and navigate to `http://localhost:5000` to view the live optimization dashboard.

---

## 📁 Repository Structure
```text
eco-loop-ai/
├── agents/             # LLM orchestrator & tool execution
├── config/             # System constants and model definitions
├── controller/         # HVAC actuation translation
├── dashboard/          # Frontend templates (HTML/JS/CSS)
├── database/           # SQLite logging & telemetry storage
├── energyplus/         # Simulation wrapper & physics engine
├── monitoring/         # Telemetry aggregation
├── prompts/            # Core system prompt instructions
├── safety/             # Comfort & safety fallback logic
├── app.py              # Flask server and autonomous main loop
└── mcp_server.py       # Model Context Protocol tools for the LLM
```

## 📜 Deliverables Included
- **Source Code:** Unified python architecture.
- **Modified IDF:** Base building files and agent-modified outputs (`AI_Optimized_Runtime.idf`).
- **Architecture Doc:** See `ARCHITECTURE.md` for deep technical insight into prompt engineering and latency management.
- **Dashboard:** Built-in quantitative comparison and export functions.

---
*Built for the Autonomous Smart Buildings Hackathon.*

<img width="1897" height="871" alt="image" src="https://github.com/user-attachments/assets/b872f37e-f563-4151-b3d6-a18a7becc5d2" />

<img width="1896" height="876" alt="image" src="https://github.com/user-attachments/assets/fb7b6fb5-55ee-4377-88aa-d0195155f86b" />

<img width="1895" height="865" alt="image" src="https://github.com/user-attachments/assets/d84ff9d8-3159-4288-8a6b-b18e9791bd4d" />

<img width="1902" height="871" alt="image" src="https://github.com/user-attachments/assets/c359ef40-f818-443c-87b9-b06bec01cd18" />

<!-- <img width="1902" height="871" alt="image" src="https://github.com/user-attachments/assets/07af71ac-6867-4ea5-b1d4-e8ff26317e64" /> -->

<img width="1896" height="867" alt="image" src="https://github.com/user-attachments/assets/963835c8-2d76-4de9-ac92-b6d8df30af22" />

<img width="1917" height="871" alt="image" src="https://github.com/user-attachments/assets/c397ae14-a914-45b2-842a-8b0e8940ca71" />








