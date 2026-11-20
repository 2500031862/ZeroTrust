# Zero Trust Network Access and Continuous Authorization

## 1. Abstract

This project implements an educational Zero Trust Network Access (ZTNA) application. It demonstrates authenticated access, role-based authorization, device trust checks, contextual risk evaluation, multi-factor authentication and security event logging.

The application uses a React frontend and Flask backend with SQLite persistence.

## 2. Objectives

- Authenticate users through login sessions.
- Apply least-privilege access policies.
- Separate Policy Decision Point (PDP) logic from protected API enforcement (PEP).
- Evaluate risk using contextual signals.
- Require MFA for medium-risk access.
- Deny protected access under high-risk conditions.
- Register and manage trusted devices.
- Record security events for auditing.

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Python, Flask |
| Database | SQLite |
| Authentication | Flask sessions |
| MFA | TOTP |
| HTTP communication | Axios |
| Testing | Pytest |
| Styling | CSS |

## 4. System Architecture

The frontend communicates with Flask API endpoints. Authentication establishes a session. Protected routes enforce authentication and device posture checks. The policy engine evaluates authorization, while the risk engine calculates contextual risk. SQLite stores user, device, MFA and security-event information.

## 5. Main Modules

### Authentication
User registration, login, session validation and logout.

### Policy Engine
Evaluates the user role, requested resource, device trust, location trust and risk level. It returns an explainable allow or deny decision.

### Risk Engine
Calculates a score using three configured signals:

- Untrusted device: +40
- Untrusted location: +30
- Three or more failed attempts: +30

Risk classification:
- LOW: 0–29
- MEDIUM: 30–59
- HIGH: 60–100

### Multi-Factor Authentication
TOTP-based MFA enrollment and verification. A successful verification creates a temporary verified session.

### Device Management
Supports device registration, trust approval, trust revocation and device removal.

### Admin Approvals
Provides an administrator workflow for reviewing and approving device trust.

### Security Activity Logs
Stores security events such as login, device and protected-resource access decisions.

## 6. Access Control Flow

1. User submits a login request.
2. Backend validates credentials and establishes a session.
3. User requests a protected resource.
4. The backend checks authentication and device posture.
5. Risk and policy decisions are evaluated.
6. The application allows access, requires MFA or denies the request.
7. Security events are recorded.

## 7. Security Design

- Default-deny policy decisions.
- Role-based authorization.
- Least-privilege resource access.
- Server-side device-trust checks on protected routes.
- MFA step-up verification.
- High-risk access denial.
- Explainable policy decisions.
- Security event logging.

## 8. Testing

The latest reported automated test run completed with 20 passed and 0 failed.

Manual development checks also covered login sessions, device trust changes, MFA verification, administrative permissions, risk calculation and protected resources.

See `Test_Case_Report.md` for the test summary.

## 9. Limitations

This is an academic MVP, not a production ZTNA deployment.

Location trust and some risk-test inputs are demonstration signals rather than independently verified enterprise context. Production deployment would require stronger device attestation, trusted location intelligence, secure secret management, HTTPS, rate limiting and hardened session management.

## 10. Future Enhancements

- Real device posture and endpoint attestation.
- Trusted geolocation or network context provider.
- Continuous session re-evaluation.
- Centralized security monitoring.
- Advanced anomaly detection.
- Production-grade secret and session management.

## 11. Conclusion

The project demonstrates core Zero Trust concepts through authentication, policy-based authorization, risk scoring, MFA, device trust and audit logging. It provides a foundation for further development of continuous authorization systems.