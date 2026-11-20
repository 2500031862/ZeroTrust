
from security.policy_engine import evaluate_access
from security.risk_engine import calculate_risk


def continuous_authorization(
    user,
    resource,
    device_trusted,
    location_trusted,
    failed_attempts
):
    risk = calculate_risk(
        device_trusted,
        location_trusted,
        failed_attempts
    )

    if risk["risk_level"] == "HIGH":
        return {
            "authorized": False,
            "reason": "High security risk detected",
            "risk": risk
        }

    access = evaluate_access(
        user,
        resource,
        device_trusted,
        location_trusted
    )

    return {
        "authorized": access["allowed"],
        "reason": access["reason"],
        "risk": risk
    }
