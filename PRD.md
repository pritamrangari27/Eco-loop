Product Requirements Document (PRD)
EcoLoop AI – Autonomous Building Energy Optimization using EnergyPlus & Local LLM

Version: 1.0
Hackathon Duration: 48 Hours
Developer: Solo
Platform: Windows 11
Simulation Engine: EnergyPlus
AI Model: Qwen2.5 1.5B (Local via Ollama)

1. Project Overview

EcoLoop AI is an autonomous AI-powered Building Management System (BMS) designed to optimize building energy consumption while maintaining occupant comfort. Unlike traditional BMS solutions that rely on fixed schedules, EcoLoop continuously monitors building conditions from EnergyPlus, reasons using a local Large Language Model (LLM), validates every decision using a deterministic Safety Engine, and automatically updates the building controls.

The project demonstrates closed-loop autonomous control, where the building continuously senses, decides, acts, and evaluates without manual intervention.

2. Problem Statement

Conventional Building Management Systems use predefined schedules for HVAC, lighting, and ventilation. These systems cannot dynamically respond to changes in weather, occupancy, or indoor comfort, leading to unnecessary energy consumption.

The objective of EcoLoop AI is to develop an intelligent building controller capable of:

Continuously monitoring building telemetry.
Making autonomous energy optimization decisions.
Maintaining occupant thermal comfort.
Explaining every AI decision.
Operating completely offline using an open-source local LLM.
3. Objectives
Primary Objectives
Reduce overall building energy consumption.
Maintain acceptable thermal comfort (PMV).
Implement a fully autonomous AI control loop.
Use a local open-source LLM (Qwen2.5).
Integrate seamlessly with EnergyPlus.
Build a modular, production-style software architecture.
Deliver a professional Building Management dashboard.
Success Criteria
Stable EnergyPlus simulation.
Continuous closed-loop operation.
Measurable energy savings.
Comfortable indoor environment.
Real-time monitoring dashboard.
Explainable AI decisions.
Clean, modular codebase suitable for GitHub.
4. System Architecture
                    Weather File (.epw)
                           │
                           ▼
                EnergyPlus Simulation
                           │
                           ▼
               Python Monitoring Service
                           │
                           ▼
                  Context Builder (JSON)
                           │
                           ▼
              Qwen2.5 Decision Agent (Ollama)
                           │
                           ▼
               Python Safety Validation Engine
                           │
                           ▼
              EnergyPlus Control API (PyEnergyPlus)
                           │
                           ▼
                 Updated Building Simulation
                           │
                           ▼
                   SQLite Decision Database
                           │
                           ▼
                  Flask REST API Backend
                           │
                           ▼
      HTML + CSS + JavaScript + Chart.js Dashboard
5. Functional Requirements
Building Simulation
Run EnergyPlus using MediumOffice.idf.
Load weather using Pune.epw.
Execute real-time building simulation.
Read simulation outputs using PyEnergyPlus.
Building Parameters
Indoor temperature
Outdoor temperature
Energy consumption
HVAC status
Lighting status
Occupancy
PMV (Predicted Mean Vote)
Weather conditions
Monitoring Service

The Monitoring Service continuously collects building telemetry and converts it into structured JSON data.

Example:

{
  "indoor_temp": 24.8,
  "outdoor_temp": 33.1,
  "energy": 71.6,
  "occupancy": 18,
  "pmv": 0.42
}
AI Decision Agent

The Decision Agent uses Qwen2.5 (running locally through Ollama) to analyse building conditions and recommend the best operational strategy.

The LLM does not directly control HVAC equipment. Instead, it selects one of several predefined strategies:

Energy Saving
Comfort Priority
Balanced Mode
Cooling Mode
Heating Mode

Example Output:

{
  "strategy": "Energy Saving",
  "reason": "Occupancy is low while indoor comfort remains acceptable."
}
Python Safety Engine

All AI decisions are validated before execution.

Validation Rules:

Safe cooling temperature range
Safe heating limits
PMV comfort validation
Invalid command detection
HVAC operational constraints

Unsafe recommendations are automatically rejected or corrected.

Control Engine

Validated strategies are converted into EnergyPlus API commands.

Example:

Strategy: Energy Saving

↓

Cooling Setpoint → 25°C

↓

Reduce ventilation

↓

Turn off unused lighting

Memory & Decision History

Every control cycle is stored in SQLite.

Stored Information:

Timestamp
Building telemetry
AI strategy
AI reasoning
Control action
Energy before
Energy after
Estimated savings

This provides complete historical analysis.

6. Dashboard

The dashboard will be developed using Flask + HTML + CSS + JavaScript + Chart.js to achieve better performance than Streamlit.

Dashboard Modules
Building Status
Indoor Temperature
Outdoor Temperature
Occupancy
PMV
HVAC Status
Current Energy Consumption
AI Decision Panel

Displays:

Current AI Strategy
AI Reasoning
Last Decision
Decision Confidence
Operations Log

Displays chronological AI activity.

Example:

10:00

Occupancy decreased.

Energy Saving Mode activated.

Cooling setpoint increased to 25°C.

Estimated savings: 11%.

-----------------------------

10:20

Building stable.

No action required.
Energy Analytics

Charts include:

Energy Consumption
Indoor Temperature
Outdoor Temperature
PMV
Occupancy
Daily Energy Savings
Baseline Comparison

Displays:

Baseline Energy Usage

↓

AI Controlled Energy Usage

↓

Estimated Percentage Savings

7. Technology Stack
Component	Technology
Simulation	EnergyPlus
Building Model	MediumOffice.idf
Weather Data	Pune.epw
Programming Language	Python
Backend	Flask
Frontend	HTML + CSS + JavaScript
Charts	Chart.js
AI Model	Qwen2.5 1.5B
LLM Runtime	Ollama
API	PyEnergyPlus
Database	SQLite
Version Control	GitHub
8. Project Structure
eco-loop-ai/

│

├── app.py

├── dashboard/
│     ├── templates/
│     ├── static/
│     │      ├── css/
│     │      ├── js/
│     │      └── images/

├── energyplus/
│      simulator.py

├── monitoring/
│      telemetry.py

├── agents/
│      decision_agent.py

├── safety/
│      validator.py

├── controller/
│      hvac_controller.py

├── database/
│      database.py

├── prompts/
│      system_prompt.txt

├── logs/

├── config/

├── data/

├── requirements.txt

└── README.md
9. Deliverables
Working EnergyPlus Simulation
Local Qwen2.5 AI Integration
Autonomous Closed-Loop Controller
Flask Web Dashboard
Energy Analytics
Decision History
Source Code (GitHub)
Architecture Documentation
Demo Video
Project Report
10. Innovation & Expected Outcome

EcoLoop AI transforms a conventional Building Management System into an intelligent autonomous control platform by combining EnergyPlus simulation, local LLM reasoning, deterministic safety validation, and real-time visualization.

Unlike traditional schedule-based systems, EcoLoop continuously adapts to changing weather, occupancy, and energy demand while maintaining occupant comfort. The modular architecture, explainable AI decisions, lightweight Flask-based dashboard, and offline deployment make the system practical, scalable, and well aligned with the hackathon's objectives of AI-driven autonomous building optimization.