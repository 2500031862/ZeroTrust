# THREAT MODEL
## ZeroTrust-ZTNA

## 1. Introduction
This document identifies potential security threats, their impacts, and security controls implemented in the ZeroTrust-ZTNA application.

## 2. Assets to Protect

| Asset | Description |
|---|---|
| User Accounts | User authentication information |
| Admin Account | Administrative privileges |
| User Sessions | Authenticated sessions |
| MFA Secrets | Authenticator enrollment data |
| Registered Devices | Device trust information |
| Dashboard | Protected application resource |
| Reports | Protected reports resource |
| Security Logs | Security event records |
| Database | User, device and event information |

## 3. Potential Threats

| ID | Threat | Impact |
|---|---|---|
| T01 | Unauthorized login | Unauthorized account access |
| T02 | Password compromise | Account takeover |
| T03 | Session theft | Unauthorized session usage |
| T04 | Untrusted device access | Unauthorized resource access |
| T05 | Privilege escalation | Unauthorized admin operations |
| T06 | High-risk request | Suspicious access |
| T07 | MFA compromise | Unauthorized verification |
| T08 | Audit log tampering | Loss of reliable records |
| T09 | Database exposure | Information disclosure |

## 4. Security Controls

| Threat | Security Control |
|---|---|
| Unauthorized login | Authentication |
| Session misuse | Session-based authentication |
| Untrusted device | Database-backed device trust |
| Privilege escalation | Role-Based Access Control |
| High-risk access | Risk-based policy engine |
| MFA compromise | TOTP-based verification |
| Unauthorized resource access | Protected API authorization |
| Missing audit evidence | Security event logging |

## 5. Zero Trust Principles

1. Never trust automatically.
2. Verify user identity.
3. Verify registered device trust.
4. Apply least-privilege access.
5. Evaluate risk before authorization.
6. Deny unauthorized requests by default.
7. Record security-related activities.

## 6. Testing Performed

- User registration and login.
- Admin-only endpoint authorization.
- Device registration and approval.
- Protected dashboard access.
- Protected reports access.
- Device trust revocation.
- HTTP 403 denial after revocation.
- Risk score calculation.
- HIGH-risk policy denial.
- MFA enrollment and OTP verification.
- Security event logging.

## 7. Known Limitations

- Device trust is evaluated at account level, not individual browser-session level.
- Location and failed-attempt signals are simulated test inputs.
- Production-grade device attestation is not implemented.
- MFA and MEDIUM-risk authorization require additional end-to-end verification.
- Audit-log tamper protection requires further improvement.

## 8. Future Enhancements

- Session-bound device verification.
- Real device posture monitoring.
- Verified location and network signals.
- Dynamic policy administration.
- Improved audit dashboard.
- Automated security testing.
- Production-grade deployment.

## 9. Conclusion

ZeroTrust-ZTNA demonstrates foundational Zero Trust security controls through authentication, device trust, MFA, risk-based authorization, role-based access control and security event logging.
