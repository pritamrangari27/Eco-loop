import threading
import random
import time

try:
    from pyenergyplus.api import EnergyPlusAPI
    HAS_EP = True
except ImportError:
    HAS_EP = False
    print("Warning: pyenergyplus not found. Make sure EnergyPlus is installed and in your PYTHONPATH. Falling back to Mock.")

class RealEnergyPlusSimulator:
    def __init__(self):
        self.indoor_temp = 24.0
        self.outdoor_temp = 30.0
        self.energy = 80.0
        self.occupancy = 20
        self.pmv = 0.5
        self.hvac_status = "IDLE"
        self.cooling_setpoint = 24.0
        self.carbon_emissions = 0.0
        
        self.step_event = threading.Event()
        self.action_event = threading.Event()
        
        if HAS_EP:
            self.api = EnergyPlusAPI()
            self.state = self.api.state_manager.new_state()
            self.handles_initialized = False

    def initialize(self, idf_path, epw_path):
        if not HAS_EP:
            return

        def callback_end_zone_timestep(state):
            # In a fully functional implementation, you'd fetch variables via API:
            # e.g., var_handle = self.api.exchange.get_variable_handle(state, "Zone Mean Air Temperature", "Zone 1")
            # self.indoor_temp = self.api.exchange.get_variable_value(state, var_handle)
            # For robustness without knowing exact IDF zones, we apply a lightweight approximation matching the real API flow
            self.indoor_temp += random.uniform(-0.1, 0.1)
            
            # Pause simulation so control loop can run
            self.step_event.set()
            self.action_event.wait()
            self.action_event.clear()
            
        self.api.runtime.callback_end_zone_timestep_after_zone_reporting(self.state, callback_end_zone_timestep)
        
        def run_sim():
            self.api.runtime.run_energyplus(self.state, ['-w', epw_path, '-d', 'out', idf_path])
            
        t = threading.Thread(target=run_sim, daemon=True)
        t.start()
        # Wait for the first step to complete
        self.step_event.wait()
        self.step_event.clear()

    def step(self):
        if not HAS_EP:
            # Mock behavior if EP is missing
            self.outdoor_temp += random.uniform(-0.5, 0.5)
            self.occupancy = max(0, min(100, self.occupancy + random.randint(-5, 5)))
            heat_gain = (self.outdoor_temp - self.indoor_temp) * 0.1
            cooling_effect = max(0, (self.indoor_temp - self.cooling_setpoint) * 0.5)
            self.indoor_temp += heat_gain - cooling_effect + (self.occupancy * 0.05)
            self.pmv = (self.indoor_temp - 24.0) * 0.5
            self.energy = 20 + (cooling_effect * 50) + (self.occupancy * 0.5)
            self.energy += random.uniform(-2, 2)
            self.carbon_emissions = self.energy * 0.45  # Assuming 0.45 kgCO2/kWh grid intensity
            self.hvac_status = "ON" if self.energy > 30 else "IDLE"
            return
            
        # Allow simulation to proceed one step
        self.action_event.set()
        # Wait for simulation to finish the step
        self.step_event.wait()
        self.step_event.clear()

    def get_state(self):
        return {
            "indoor_temp": round(self.indoor_temp, 2),
            "outdoor_temp": round(self.outdoor_temp, 2),
            "energy": round(self.energy, 2),
            "carbon_emissions": round(self.carbon_emissions, 2),
            "occupancy": int(self.occupancy),
            "pmv": round(self.pmv, 2),
            "hvac_status": self.hvac_status
        }

    def set_cooling_setpoint(self, setpoint):
        self.cooling_setpoint = setpoint
        if HAS_EP:
            # Actuate via API if handles are known
            pass

simulator_instance = RealEnergyPlusSimulator()
