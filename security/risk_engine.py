
def calculate_risk(device_trusted, location_trusted, failed_attempts):
    """
    Calculate risk score based on security signals.
    """

    risk_score = 0

    if not device_trusted:
        risk_score += 40

    if not location_trusted:
        risk_score += 30

    if failed_attempts >= 3:
        risk_score += 30

    if risk_score >= 60:
        risk_level = "HIGH"

    elif risk_score >= 30:
        risk_level = "MEDIUM"

    else:
        risk_level = "LOW"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level
    }   