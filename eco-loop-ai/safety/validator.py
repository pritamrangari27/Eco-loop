def validate_strategy(strategy, telemetry):
    """
    Validates the AI's strategy and returns safe control actions.
    """
    # Safe limits
    MIN_COOLING_SP = 22.0
    MAX_COOLING_SP = 27.0
    
    current_temp = telemetry.get('indoor_temp')
    pmv = telemetry.get('pmv')
    
    # Default fallback
    validated_action = "Maintain Current Operations"
    cooling_setpoint = 24.0
    
    if strategy == "Energy Saving":
        # Check if PMV allows energy saving (PMV < 0.5)
        if pmv < 0.7:
            cooling_setpoint = 26.0
            validated_action = "Increased Cooling Setpoint to 26°C"
        else:
            strategy = "Balanced Mode (Safety Override)"
            cooling_setpoint = 24.0
            validated_action = "Energy Saving rejected due to high PMV"
            
    elif strategy == "Comfort Priority":
        cooling_setpoint = 23.0
        validated_action = "Decreased Cooling Setpoint to 23°C"
        
    elif strategy == "Cooling Mode":
        if current_temp > 25.0:
            cooling_setpoint = MIN_COOLING_SP
            validated_action = f"Max cooling. Setpoint: {MIN_COOLING_SP}°C"
        else:
            cooling_setpoint = 24.0
            validated_action = "Cooling not required. Maintaining 24°C"
            
    elif strategy == "Heating Mode":
        validated_action = "Heating mode not active in this season."
        cooling_setpoint = 26.0
        
    else: # Balanced
        cooling_setpoint = 24.0
        validated_action = "Maintaining optimal 24°C"
        
    return {
        "final_strategy": strategy,
        "action": validated_action,
        "cooling_setpoint": cooling_setpoint
    }
