
from security.risk_engine import calculate_risk


# TEST 1: LOW RISK
def test_low_risk():
    result = calculate_risk(True, True, 0)

    assert result["risk_level"] == "LOW"
    assert result["risk_score"] == 0


# TEST 2: MEDIUM RISK
def test_medium_risk():
    result = calculate_risk(False, True, 0)

    assert result["risk_level"] == "MEDIUM"
    assert result["risk_score"] == 40


# TEST 3: HIGH RISK
def test_high_risk():
    result = calculate_risk(False, False, 3)

    assert result["risk_level"] == "HIGH"
    assert result["risk_score"] == 100


# RUN TESTS
if __name__ == "__main__":
    test_low_risk()
    test_medium_risk()
    test_high_risk()

    print("LOW RISK: PASSED")
    print("MEDIUM RISK: PASSED")
    print("HIGH RISK: PASSED")
    print("ALL RISK TESTS PASSED!")
