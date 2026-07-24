from energyplus.simulator import simulator_instance

def get_telemetry():
    """
    Fetches raw data from the simulator and formats it into structured JSON.
    """
    return simulator_instance.get_state()
