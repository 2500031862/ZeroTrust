def evaluate_access(
    user,
    resource,
    device_trusted,
    location_trusted,
    risk_level="LOW",
    mfa_verified=False
):
    """Policy Decision Point: default-deny access evaluation."""

    # The API layer must authenticate the session before calling this policy.
    if not isinstance(user, dict) or not user.get("role"):
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": "User authentication required"
        }

    role = user.get("role")

    if role not in {"admin", "user"}:
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": "Unknown account role"
        }

    if risk_level not in {"LOW", "MEDIUM", "HIGH"}:
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": "Invalid or unknown risk level"
        }

    if risk_level == "HIGH":
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": "Access denied due to HIGH security risk"
        }

    if device_trusted is not True:
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": "Untrusted device"
        }

    if location_trusted is not True:
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": "Untrusted location"
        }

    if risk_level == "MEDIUM" and mfa_verified is not True:
        return {
            "allowed": False,
            "step_up_required": True,
            "reason": "MFA verification required"
        }

    if role == "admin":
        allowed_resources = {"dashboard", "reports", "admin_panel"}
    else:
        allowed_resources = {"dashboard", "reports"}

    if resource not in allowed_resources:
        reason = (
            "Insufficient permissions"
            if resource == "admin_panel"
            else "Unknown or unauthorized resource"
        )
        return {
            "allowed": False,
            "step_up_required": False,
            "reason": reason
        }

    return {
        "allowed": True,
        "step_up_required": False,
        "reason": f"{'Admin' if role == 'admin' else 'User'} access approved for {resource}"
    }