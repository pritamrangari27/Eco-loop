from energyplus.simulator import simulator_instance

def execute_action(action_payload):
    """
    Translates validated actions into simulator commands.
    """
    setpoint = action_payload.get('cooling_setpoint', 24.0)
    simulator_instance.set_cooling_setpoint(setpoint)
    return True
