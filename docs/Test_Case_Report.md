# ZeroTrust Test Case Report

## 1. Test Environment

- Backend: Python and Flask
- Frontend: React and Vite
- Database: SQLite
- Test framework: Pytest

## 2. Automated Test Summary

| Metric | Result |
|---|---:|
| Total tests | 20 |
| Passed | 20 |
| Failed | 0 |
| Result | PASS |

Recorded from the latest test output supplied during project development.

Command:

```powershell
python -m pytest -q
```

## 3. Functional Test Evidence

| Test | Expected behavior | Development observation |
|---|---|---|
| User login | Valid credentials establish a session | Verified |
| Unauthenticated API request | Return HTTP 401 | Verified |
| LOW risk calculation | Score 0, LOW | Verified |
| MEDIUM risk calculation | Score 30, MEDIUM | Verified |
| HIGH risk calculation | Score 60, HIGH | Verified |
| MFA enrollment | Create TOTP enrollment | Verified |
| MFA verification | Successful OTP verification | Verified |
| Device registration | Register a device | Verified |
| Device trust revocation | Block protected access | Verified |
| Device trust restoration | Permit eligible protected access | Verified |
| Normal user admin endpoint | Return HTTP 403 | Verified |
| Reports and audit logs | Return recorded activity | Verified |

These are manual development observations, not a claim that each row is a separate automated test.

## 4. Policy Test Scenarios

| Scenario | Expected policy behavior |
|---|---|
| Valid user, LOW risk, trusted signals | Allow |
| MEDIUM risk without MFA | Deny and request step-up |
| HIGH risk | Deny |
| Untrusted device | Deny |
| Untrusted location | Deny |
| Missing authenticated principal | Deny |
| Normal user requests admin resource | Deny |
| Administrator requests authorized admin resource | Allow |
| Unknown risk level | Deny |

## 5. Risk Calculation Examples

| Device | Location | Failed attempts | Score | Level |
|---|---|---:|---:|---|
| Trusted | Trusted | 0 | 0 | LOW |
| Trusted | Untrusted | 0 | 30 | MEDIUM |
| Trusted | Untrusted | 3 | 60 | HIGH |

## 6. Notes

The risk calculation tests use supplied context values. Location trust is a demonstration signal in the current implementation. The project requires additional integration and production-security testing before deployment outside an academic demonstration.

## 7. Conclusion

The latest automated test suite completed successfully with 20 passing tests and no failures. Functional checks were also performed during development.