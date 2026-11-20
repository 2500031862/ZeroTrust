
import os
import time
import pyotp

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from dotenv import load_dotenv

from database.db import (
    init_db,
    log_security_event,
    get_security_events,
    save_mfa_secret,
    get_mfa_secret,
    register_device,
    get_user_devices,
    get_user_trusted_device,
    get_all_devices,
    update_device_trust,
    delete_device
)

from auth.authentication import register_user, login_user
from security.risk_engine import calculate_risk
from security.policy_engine import evaluate_access


# ==========================================
# CONFIGURATION
# ==========================================

load_dotenv()

app = Flask(__name__)

CORS(
    app,
    resources={r"/api/*": {"origins": ["http://10.123.55.174:5173"]}},
    supports_credentials=True
)
CORS(
    app,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    supports_credentials=True
)

app.secret_key = os.getenv("SECRET_KEY")

if not app.secret_key:
    raise RuntimeError("SECRET_KEY is missing from .env")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)

init_db()


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def error_response(message, status_code):
    return jsonify({
        "success": False,
        "message": message
    }), status_code


def get_authenticated_user():
    return session.get("user")


def is_mfa_verified():
    expiry = session.get("mfa_verified_until", 0)
    return time.time() < expiry


def is_user_device_trusted(username):
    """Server-side posture check; never trust a client-supplied trust flag."""
    device = get_user_trusted_device(username)
    return device is not None


def validate_access_data(data):

    resource = data.get("resource")
    device_trusted = data.get("device_trusted")
    location_trusted = data.get("location_trusted")
    failed_attempts = data.get("failed_attempts", 0)

    if (
        not isinstance(resource, str)
        or not resource.strip()
        or not isinstance(device_trusted, bool)
        or not isinstance(location_trusted, bool)
        or type(failed_attempts) is not int
        or failed_attempts < 0
    ):
        return None

    return (
        resource.strip(),
        device_trusted,
        location_trusted,
        failed_attempts
    )


def record_event(
    username,
    event_type,
    resource=None,
    decision=None,
    reason=None,
    risk_level=None
):
    try:
        log_security_event(
            username=username,
            event_type=event_type,
            resource=resource,
            decision=decision,
            reason=reason,
            risk_level=risk_level
        )
    except Exception as error:
        app.logger.error(
            "Security event logging failed: %s",
            error
        )


# ==========================================
# HOME
# ==========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message": "ZeroTrust-ZTNA Backend is running",
        "status": "success"
    })


# ==========================================
# REGISTER
# ==========================================

@app.route("/api/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return error_response("All fields are required", 400)

    success, message = register_user(
        username,
        email,
        password
    )

    if success:
        record_event(
            username=username,
            event_type="USER_REGISTERED",
            resource="authentication",
            decision="SUCCESS",
            reason="New user registered"
        )

    return jsonify({
        "success": success,
        "message": message
    }), 201 if success else 400


# ==========================================
# LOGIN
# ==========================================

@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return error_response(
            "Email and password are required",
            400
        )

    success, result = login_user(email, password)

    if not success:
        return error_response(str(result), 401)

    session.clear()
    session["user"] = result

    record_event(
        username=result.get("username"),
        event_type="LOGIN_SUCCESS",
        resource="authentication",
        decision="ALLOWED",
        reason="User authenticated successfully"
    )

    return jsonify({
        "success": True,
        "message": "Login successful",
        "user": result
    })


# ==========================================
# CURRENT USER
# ==========================================

@app.route("/api/me", methods=["GET"])
def current_user():

    user = get_authenticated_user()

    if not user:
        return jsonify({
            "authenticated": False,
            "message": "Please login"
        }), 401

    return jsonify({
        "authenticated": True,
        "user": user
    })


# ==========================================
# MULTI-FACTOR AUTHENTICATION
# ==========================================

@app.route("/api/mfa/setup", methods=["POST"])
def setup_mfa():

    user = get_authenticated_user()

    if not user:
        return error_response(
            "Authentication required",
            401
        )

    username = user.get("username")

    secret = get_mfa_secret(username)

    if not secret:
        secret = pyotp.random_base32()
        save_mfa_secret(username, secret)

    totp = pyotp.TOTP(secret)

    provisioning_uri = totp.provisioning_uri(
        name=user.get("email"),
        issuer_name="ZeroTrust-ZTNA"
    )

    record_event(
        username=username,
        event_type="MFA_SETUP",
        resource="mfa",
        decision="SUCCESS",
        reason="MFA enrollment details generated"
    )

    return jsonify({
        "success": True,
        "message": "MFA setup successful",
        "secret": secret,
        "provisioning_uri": provisioning_uri
    })


@app.route("/api/mfa/verify", methods=["POST"])
def verify_mfa():

    user = get_authenticated_user()

    if not user:
        return error_response(
            "Authentication required",
            401
        )

    data = request.get_json(silent=True) or {}

    otp = str(data.get("otp", "")).strip()

    if len(otp) != 6 or not otp.isdigit():
        return error_response(
            "Enter a valid 6-digit OTP",
            400
        )

    secret = get_mfa_secret(user.get("username"))

    if not secret:
        return error_response(
            "Please setup MFA first",
            400
        )

    totp = pyotp.TOTP(secret)

    if not totp.verify(otp, valid_window=0):

        record_event(
            username=user.get("username"),
            event_type="MFA_VERIFICATION_FAILED",
            resource="mfa",
            decision="DENIED",
            reason="Invalid OTP"
        )

        return error_response("Invalid OTP", 401)

    # MFA verification valid for five minutes
    session["mfa_verified_until"] = time.time() + 300

    record_event(
        username=user.get("username"),
        event_type="MFA_VERIFICATION_SUCCESS",
        resource="mfa",
        decision="ALLOWED",
        reason="MFA verification successful"
    )

    return jsonify({
        "success": True,
        "message": "MFA verification successful",
        "verified": True,
        "valid_for_seconds": 300
    })


# ==========================================
# LOGOUT
# ==========================================

@app.route("/api/logout", methods=["POST"])
def logout():

    user = get_authenticated_user()

    if user:
        record_event(
            username=user.get("username"),
            event_type="LOGOUT",
            resource="authentication",
            decision="SUCCESS",
            reason="User logged out"
        )

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    })


# ==========================================
# RISK ENGINE
# ==========================================

@app.route("/api/risk", methods=["POST"])
def evaluate_risk():

    user = get_authenticated_user()

    if not user:
        return error_response(
            "Please login first",
            401
        )

    data = request.get_json(silent=True) or {}

    device_trusted = data.get("device_trusted")
    location_trusted = data.get("location_trusted")
    failed_attempts = data.get("failed_attempts")

    if (
        not isinstance(device_trusted, bool)
        or not isinstance(location_trusted, bool)
        or type(failed_attempts) is not int
        or failed_attempts < 0
    ):
        return error_response(
            "Invalid risk evaluation data",
            400
        )

    result = calculate_risk(
        device_trusted,
        location_trusted,
        failed_attempts
    )

    record_event(
        username=user.get("username"),
        event_type="RISK_EVALUATED",
        resource="risk_engine",
        decision="EVALUATED",
        reason=f"Risk score: {result['risk_score']}",
        risk_level=result["risk_level"]
    )

    return jsonify({
        "success": True,
        "risk": result
    })


# ==========================================
# ACCESS CONTROL - PDP
# ==========================================

@app.route("/api/access", methods=["POST"])
def access_control():

    user = get_authenticated_user()

    if not user:
        return error_response(
            "Authentication required",
            401
        )

    data = request.get_json(silent=True) or {}

    validated = validate_access_data(data)

    if not validated:
        return error_response(
            "Invalid access request",
            400
        )

    (
        resource,
        _client_device_trusted,
        location_trusted,
        failed_attempts
    ) = validated

    # Continuous authorization: resolve device trust from the database on
    # every access decision. The browser cannot grant itself device trust.
    device_trusted = is_user_device_trusted(user.get("username"))

    # Calculate risk for every access request
    risk = calculate_risk(
        device_trusted,
        location_trusted,
        failed_attempts
    )

    risk_level = risk["risk_level"]

    # Check MFA session
    mfa_verified = is_mfa_verified()

    # PDP: Evaluate access policy
    decision = evaluate_access(
        user=user,
        resource=resource,
        device_trusted=device_trusted,
        location_trusted=location_trusted,
        risk_level=risk_level,
        mfa_verified=mfa_verified
    )

    allowed = decision["allowed"]

    event_decision = (
        "ALLOWED" if allowed
        else "STEP_UP_REQUIRED" if decision.get("step_up_required")
        else "DENIED"
    )

    record_event(
        username=user.get("username"),
        event_type="ACCESS_DECISION",
        resource=resource,
        decision=event_decision,
        reason=decision["reason"],
        risk_level=risk_level
    )

    return jsonify({
        "success": True,
        "resource": resource,
        "risk": risk,
        "mfa_verified": mfa_verified,
        **decision
    }), 200


# ==========================================
# FIRST PROTECTED RESOURCE - DASHBOARD
# ==========================================

@app.route("/api/dashboard-data", methods=["GET"])
def protected_dashboard():

    user = get_authenticated_user()

    if not user:
        return error_response(
            "Authentication required",
            401
        )

    # Device posture is checked server-side on every protected request.
    device_trusted = is_user_device_trusted(user.get("username"))
    # Location remains a demo context signal until a trusted location provider
    # is configured; do not treat this as verified geolocation.
    location_trusted = True

    risk = calculate_risk(
        device_trusted,
        location_trusted,
        0
    )

    decision = evaluate_access(
        user,
        "dashboard",
        device_trusted,
        location_trusted,
        risk_level=risk["risk_level"],
        mfa_verified=is_mfa_verified()
    )

    if not decision["allowed"]:

        record_event(
            username=user.get("username"),
            event_type="DASHBOARD_ACCESS_DENIED",
            resource="dashboard",
            decision="DENIED",
            reason=decision["reason"],
            risk_level=risk["risk_level"]
        )

        return jsonify({
            "success": False,
            "resource": "dashboard",
            **decision
        }), 403

    record_event(
        username=user.get("username"),
        event_type="DASHBOARD_ACCESS",
        resource="dashboard",
        decision="ALLOWED",
        reason="Dashboard access approved",
        risk_level=risk["risk_level"]
    )

    return jsonify({
        "success": True,
        "resource": "dashboard",
        "decision": "ALLOWED",
        "message": "Dashboard access approved"
    })


# ==========================================
# SECOND PROTECTED RESOURCE - REPORTS
# ==========================================

@app.route("/api/reports", methods=["GET"])
def protected_reports():

    user = get_authenticated_user()

    if not user:
        return error_response(
            "Authentication required",
            401
        )

    # Device posture is checked server-side on every protected request.
    device_trusted = is_user_device_trusted(user.get("username"))
    # Location remains a demo context signal until a trusted location provider
    # is configured; do not treat this as verified geolocation.
    location_trusted = True

    risk = calculate_risk(
        device_trusted,
        location_trusted,
        0
    )

    decision = evaluate_access(
        user,
        "reports",
        device_trusted,
        location_trusted,
        risk_level=risk["risk_level"],
        mfa_verified=is_mfa_verified()
    )

    if not decision["allowed"]:

        record_event(
            username=user.get("username"),
            event_type="REPORTS_ACCESS_DENIED",
            resource="reports",
            decision="DENIED",
            reason=decision["reason"],
            risk_level=risk["risk_level"]
        )

        return jsonify({
            "success": False,
            "resource": "reports",
            **decision
        }), 403

    record_event(
        username=user.get("username"),
        event_type="REPORTS_ACCESS",
        resource="reports",
        decision="ALLOWED",
        reason="Reports access approved",
        risk_level=risk["risk_level"]
    )

    # Only show the authenticated user's events
    events = get_security_events(
        limit=100,
        username=user.get("username")
    )

    reports = []

    for event in events:

        reports.append({
            "id": event["id"],
            "username": event["username"],
            "event_type": event["event_type"],
            "title": event["event_type"].replace("_", " ").title(),
            "resource": event["resource"],
            "status": event["decision"],
            "reason": event["reason"],
            "risk_level": event["risk_level"],
            "created_at": event["created_at"]
        })

    return jsonify({
        "success": True,
        "resource": "reports",
        "decision": "ALLOWED",
        "total_events": len(reports),
        "reports": reports
    }), 200



# ==========================================
# DEVICE MANAGEMENT
# ==========================================

@app.route("/api/devices", methods=["GET"])
def list_devices():
    user = get_authenticated_user()

    if not user:
        return error_response("Authentication required", 401)

    username = user.get("username")
    devices = get_user_devices(username)

    return jsonify({
        "success": True,
        "total_devices": len(devices),
        "devices": devices
    }), 200


@app.route("/api/admin/devices", methods=["GET"])
def admin_list_devices():
    user = get_authenticated_user()

    if not user:
        return error_response("Authentication required", 401)

    if user.get("role") != "admin":
        return error_response("Administrator access required", 403)

    devices = get_all_devices()

    return jsonify({
        "success": True,
        "total_devices": len(devices),
        "devices": devices
    }), 200


@app.route("/api/devices/register", methods=["POST"])
def add_device():
    user = get_authenticated_user()

    if not user:
        return error_response("Authentication required", 401)

    data = request.get_json(silent=True) or {}

    device_name = data.get("device_name")
    device_type = data.get("device_type", "Unknown")
    operating_system = data.get("operating_system", "Unknown")

    if not isinstance(device_name, str) or not device_name.strip():
        return error_response("Device name is required", 400)

    if len(device_name.strip()) > 100:
        return error_response("Device name is too long", 400)

    if not isinstance(device_type, str) or not isinstance(operating_system, str):
        return error_response("Invalid device details", 400)

    username = user.get("username")

    try:
        register_device(
            username=username,
            device_name=device_name.strip(),
            device_type=device_type.strip()[:50] or "Unknown",
            operating_system=operating_system.strip()[:100] or "Unknown"
        )
    except Exception:
        app.logger.exception("Device registration failed")
        return error_response("Could not register device", 400)

    record_event(
        username=username,
        event_type="DEVICE_REGISTERED",
        resource="device_management",
        decision="SUCCESS",
        reason=f"Device registered: {device_name.strip()}"
    )

    return jsonify({
        "success": True,
        "message": "Device registered successfully",
        "devices": get_user_devices(username)
    }), 201


@app.route("/api/devices/<int:device_id>/trust", methods=["POST"])
def change_device_trust(device_id):
    user = get_authenticated_user()

    if not user:
        return error_response("Authentication required", 401)

    data = request.get_json(silent=True) or {}
    trusted = data.get("trusted")

    if not isinstance(trusted, bool):
        return error_response("'trusted' must be true or false", 400)

    username = user.get("username")
    role = user.get("role", "user")

    # A normal user may revoke trust, but only an administrator
    # may mark a device as trusted.
    if trusted and role != "admin":
        return error_response(
            "Administrator approval is required to trust a device",
            403
        )

    updated = update_device_trust(
        device_id=device_id,
        username=username,
        trusted=trusted,
        is_admin=(role == "admin")
    )

    if not updated:
        return error_response("Device not found", 404)

    record_event(
        username=username,
        event_type="DEVICE_TRUST_GRANTED" if trusted else "DEVICE_TRUST_REVOKED",
        resource=f"device:{device_id}",
        decision="SUCCESS",
        reason="Device trust status updated"
    )

    return jsonify({
        "success": True,
        "message": "Device trust updated",
        "device_id": device_id,
        "device_status": "TRUSTED" if trusted else "UNTRUSTED"
    }), 200


@app.route("/api/devices/<int:device_id>", methods=["DELETE"])
def remove_device(device_id):
    user = get_authenticated_user()

    if not user:
        return error_response("Authentication required", 401)

    username = user.get("username")
    deleted = delete_device(device_id=device_id, username=username)

    if not deleted:
        return error_response("Device not found", 404)

    record_event(
        username=username,
        event_type="DEVICE_REMOVED",
        resource=f"device:{device_id}",
        decision="SUCCESS",
        reason="Registered device removed"
    )

    return jsonify({
        "success": True,
        "message": "Device removed successfully"
    }), 200



# ==========================================
# RUN SERVER
# ==========================================


# ADMIN USER MANAGEMENT
@app.route("/api/admin/users", methods=["GET"])
def admin_list_users():
    user = get_authenticated_user()

    if not user:
        return error_response("Authentication required", 401)

    if user.get("role") != "admin":
        return error_response("Administrator access required", 403)

    from database.db import get_all_users

    users = get_all_users()

    return jsonify({
        "success": True,
        "total_users": len(users),
        "users": users
    }), 200


if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
