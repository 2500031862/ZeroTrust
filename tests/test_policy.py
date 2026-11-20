
from security.policy_engine import evaluate_access


# ==========================================
# TEST 1: LOW RISK - ALLOW ACCESS
# ==========================================

def test_low_risk_access():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "dashboard",
        True,
        True,
        "LOW"
    )

    assert result["allowed"] is True
    assert result["step_up_required"] is False
    assert result["reason"] == "User access approved for dashboard"


# ==========================================
# TEST 2: MEDIUM RISK - STEP UP REQUIRED
# ==========================================

def test_medium_risk_access():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "dashboard",
        True,
        True,
        "MEDIUM"
    )

    assert result["allowed"] is False
    assert result["step_up_required"] is True


# ==========================================
# TEST 3: HIGH RISK - DENY ACCESS
# ==========================================

def test_high_risk_access():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "dashboard",
        True,
        True,
        "HIGH"
    )

    assert result["allowed"] is False
    assert result["step_up_required"] is False


# ==========================================
# TEST 4: UNTRUSTED DEVICE
# ==========================================

def test_untrusted_device():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "dashboard",
        False,
        True,
        "LOW"
    )

    assert result["allowed"] is False
    assert result["reason"] == "Untrusted device"


# ==========================================
# TEST 5: UNTRUSTED LOCATION
# ==========================================

def test_untrusted_location():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "dashboard",
        True,
        False,
        "LOW"
    )

    assert result["allowed"] is False
    assert result["reason"] == "Untrusted location"


# ==========================================
# TEST 6: UNAUTHENTICATED USER
# ==========================================

def test_unauthenticated_user():

    result = evaluate_access(
        None,
        "dashboard",
        True,
        True,
        "LOW"
    )

    assert result["allowed"] is False
    assert result["reason"] == "User authentication required"


# ==========================================
# TEST 7: INSUFFICIENT PERMISSIONS
# ==========================================

def test_insufficient_permissions():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "admin_panel",
        True,
        True,
        "LOW"
    )

    assert result["allowed"] is False
    assert result["reason"] == "Insufficient permissions"


# ==========================================
# TEST 8: ADMIN ACCESS
# ==========================================

def test_admin_access():

    user = {"role": "admin"}

    result = evaluate_access(
        user,
        "admin_panel",
        True,
        True,
        "LOW"
    )

    assert result["allowed"] is True
    assert result["step_up_required"] is False


# ==========================================
# TEST 9: INVALID RISK LEVEL
# ==========================================

def test_invalid_risk_level():

    user = {"role": "user"}

    result = evaluate_access(
        user,
        "dashboard",
        True,
        True,
        "UNKNOWN"
    )

    assert result["allowed"] is False
    assert result["reason"] == "Invalid or unknown risk level"
