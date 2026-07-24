import random
import time

class EnergyPlusMock:
    def __init__(self):
        self.indoor_temp = 24.0
        self.outdoor_temp = 30.0
        self.energy = 80.0
        self.occupancy = 20
        self.pmv = 0.5
        self.cooling_setpoint = 24.0

    def step(self):
        # Simulate building physics over time
        # Outdoor temp fluctuates
        self.outdoor_temp += random.uniform(-0.5, 0.5)
        # Occupancy fluctuates based on time (mocked randomly for now)
        self.occupancy = max(0, min(100, self.occupancy + random.randint(-5, 5)))
        
        # Indoor temp moves towards outdoor temp unless cooled
        heat_gain = (self.outdoor_temp - self.indoor_temp) * 0.1
        cooling_effect = max(0, (self.indoor_temp - self.cooling_setpoint) * 0.5)
        self.indoor_temp += heat_gain - cooling_effect + (self.occupancy * 0.05)
        
        # PMV depends on indoor temp (ideal is around 23-25)
        self.pmv = (self.indoor_temp - 24.0) * 0.5
        
        # Energy consumption depends on cooling effect + baseline + occupancy
        self.energy = 20 + (cooling_effect * 50) + (self.occupancy * 0.5)
        
        # Add some noise
        self.energy += random.uniform(-2, 2)
        self.indoor_temp += random.uniform(-0.1, 0.1)

    def get_state(self):
        return {
            "indoor_temp": round(self.indoor_temp, 2),
            "outdoor_temp": round(self.outdoor_temp, 2),
            "energy": round(self.energy, 2),
            "occupancy": int(self.occupancy),
            "pmv": round(self.pmv, 2),
            "hvac_status": "ON" if self.energy > 30 else "IDLE"
        }

    def set_cooling_setpoint(self, setpoint):
        self.cooling_setpoint = setpoint
        
simulator_instance = EnergyPlusMock()
