import os
import time
import threading
from flask import Flask, render_template, jsonify, request
from config.settings import LOOP_INTERVAL_SECONDS
from database.database import init_db, log_decision, get_history
from monitoring.telemetry import get_telemetry
from agents.decision_agent import get_ai_decision
from safety.validator import validate_strategy
from controller.hvac_controller import execute_action
from energyplus.simulator import simulator_instance

app = Flask(__name__, template_folder='dashboard/templates', static_folder='dashboard/static')

# Global state for dashboard
current_state = {}
simulation_ready = threading.Event()

def autonomous_control_loop():
    global current_state
    print("Waiting for simulation files to be uploaded...")
    simulation_ready.wait()
    print("Starting Autonomous Control Loop with real EnergyPlus data...")
    while True:
        # 1. Simulator steps forward
        simulator_instance.step()
        
        # 2. Get Telemetry
        telemetry = get_telemetry()
        
        # 3. AI Agent Decision
        ai_response = get_ai_decision(telemetry)
        strategy = ai_response.get("strategy", "Balanced Mode")
        reason = ai_response.get("reason", "No reason provided")
        
        # 4. Safety Validation
        validation = validate_strategy(strategy, telemetry)
        final_strategy = validation["final_strategy"]
        action = validation["action"]
        
        # 5. Execute Action
        execute_action(validation)
        
        # Estimate savings logic (mock)
        savings = 0.0
        if final_strategy == "Energy Saving":
            savings = round((telemetry.get('energy') * 0.15), 2)
            
        # 6. Log to Database
        log_decision(telemetry, final_strategy, reason, action, savings)
        
        # Update global state for UI
        current_state = {
            "telemetry": telemetry,
            "ai": {
                "strategy": final_strategy,
                "reason": reason,
                "action": action,
                "savings": savings
            }
        }
        
        time.sleep(LOOP_INTERVAL_SECONDS)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'epw_file' not in request.files or 'idf_file' not in request.files:
        return jsonify({"error": "Missing files"}), 400
    
    epw_file = request.files['epw_file']
    idf_file = request.files['idf_file']
    
    upload_dir = os.path.join(os.path.dirname(__file__), 'data', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    epw_path = os.path.join(upload_dir, epw_file.filename)
    idf_path = os.path.join(upload_dir, idf_file.filename)
    
    epw_file.save(epw_path)
    idf_file.save(idf_path)
    
    # Initialize simulator
    simulator_instance.initialize(idf_path, epw_path)
    
    # Signal the loop to start
    simulation_ready.set()
    
    return jsonify({"message": "Files uploaded and simulation initialized"})

@app.route('/api/status')
def status():
    return jsonify(current_state)

@app.route('/api/history')
def history():
    return jsonify(get_history(20))

if __name__ == '__main__':
    init_db()
    # Start the control loop in a background thread
    loop_thread = threading.Thread(target=autonomous_control_loop, daemon=True)
    loop_thread.start()
    # Start Flask
    app.run(debug=False, port=5000, host='0.0.0.0')
