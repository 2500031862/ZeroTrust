
from security.continuous_auth import continuous_authorization


def test_authorized_user():
    result = continuous_authorization(
        {"role": "user"},
        "dashboard",
        True,
        True,
        0
    )
    assert result["authorized"] is True


def test_high_risk_user():
    result = continuous_authorization(
        {"role": "user"},
        "dashboard",
        False,
        False,
        3
    )
    assert result["authorized"] is False


def test_untrusted_device():
    result = continuous_authorization(
        {"role": "user"},
        "dashboard",
        False,
        True,
        0
    )
    assert result["authorized"] is False
