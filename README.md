# ZeroTrust-ZTNA

An educational project demonstrating Zero Trust Network Access and Continuous Authorization.

## Features

- User authentication and session management
- Role-based access control
- Policy Decision Point and protected API enforcement
- Contextual risk scoring
- TOTP-based multi-factor authentication
- Device registration and trust approval
- Administrator device approvals
- Security activity and audit logs
- React security dashboard

## Technology

React, Vite, Python, Flask, SQLite, PyOTP and Pytest.

## Project Structure

```text
ZeroTrust-ZTNA/
├── app.py
├── auth/
├── database/
├── security/
├── frontend/
├── tests/
└── docs/
    ├── Threat_Model.md
    ├── Test_Case_Report.md
    ├── Final_Project_Report.md
    ├── architecture.mmd
    └── screenshots/
```

## Run Backend

Open PowerShell in the project root:

```powershell
.\.venv\Scripts\Activate.ps1
python app.py
```

Backend URL: http://127.0.0.1:5000

## Run Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: http://localhost:5173

## Run Automated Tests

From the project root:

```powershell
python -m pytest -q
```

Latest development result reported: 20 passed, 0 failed.

## Documentation

See the `docs` directory for the threat model, final project report, test report and architecture diagram source.

## Academic Project Notice

This is an educational MVP. It is not a production-ready enterprise security solution. Review the limitations in the final project report before deployment.