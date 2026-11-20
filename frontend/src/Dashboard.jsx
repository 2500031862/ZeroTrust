import UsersManagement from "./UsersManagement";

import { useEffect, useState } from "react";
import axios from "axios";
import AdminDeviceApprovals from "./AdminDeviceApprovals";
import {
  ShieldCheck,
  Activity,
  Monitor,
  MapPin,
  Lock,
  LayoutDashboard,
  Users,
  FileText,
  LogOut,
  ShieldAlert,
  KeyRound,
  Settings,
  Smartphone,
  RefreshCw,
  Trash2
} from "lucide-react";

import Reports from "./Reports";
import "./Dashboard.css";

const API = "";

function Dashboard({ user, onLogout }) {
  const [risk, setRisk] = useState(null);
  const [riskError, setRiskError] = useState("");
  const [riskLoading, setRiskLoading] = useState(true);

  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState("");
  const [accessLoading, setAccessLoading] = useState(true);

  const [activePage, setActivePage] = useState("overview");

  // MFA states
  const [mfaSecret, setMfaSecret] = useState("");
  const [provisioningUri, setProvisioningUri] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  // Device Management states
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceSubmitting, setDeviceSubmitting] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState("");
  const [deviceForm, setDeviceForm] = useState({
    device_name: "",
    device_type: "Laptop",
    operating_system: "Windows 11"
  });

  const testSignals = {
    device_trusted: true,
    location_trusted: true,
    failed_attempts: 0
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchSecurityData() {
      try {
        const riskResponse = await axios.post(
          `${API}/api/risk`,
          testSignals,
          { withCredentials: true }
        );

        if (!cancelled) {
          setRisk(riskResponse.data.risk);
          setRiskError("");
        }
      } catch (error) {
        if (!cancelled) {
          setRiskError(
            error.response?.data?.message ||
            "Risk evaluation failed"
          );
        }
      } finally {
        if (!cancelled) setRiskLoading(false);
      }

      try {
        const accessResponse = await axios.post(
          `${API}/api/access`,
          {
            resource: "dashboard",
            ...testSignals
          },
          { withCredentials: true }
        );

        if (!cancelled) {
          setAccess(accessResponse.data);
          setAccessError("");
        }
      } catch (error) {
        if (!cancelled) {
          setAccess(null);
          setAccessError(
            error.response?.data?.message ||
            "Access evaluation failed"
          );
        }
      } finally {
        if (!cancelled) setAccessLoading(false);
      }
    }

    fetchSecurityData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Generate or retrieve MFA enrollment details
  async function setupMFA() {
    setMfaLoading(true);
    setMfaMessage("");

    try {
      const response = await axios.post(
        `${API}/api/mfa/setup`,
        {},
        { withCredentials: true }
      );

      setMfaSecret(response.data.secret || "");
      setProvisioningUri(response.data.provisioning_uri || "");
      setMfaMessage("MFA setup details generated successfully.");
    } catch (error) {
      setMfaMessage(
        error.response?.data?.message || "MFA setup failed."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  // Verify OTP and retry a pending dashboard access request
  async function verifyMFA(e) {
    e.preventDefault();

    if (otp.length !== 6) {
      setMfaMessage("Enter a valid 6-digit OTP.");
      return;
    }

    setMfaLoading(true);
    setMfaMessage("");

    try {
      const response = await axios.post(
        `${API}/api/mfa/verify`,
        { otp },
        { withCredentials: true }
      );

      if (response.data.success) {
        setMfaMessage("MFA verification successful.");

        // Retry access after successful step-up verification
        if (access?.step_up_required) {
          const retryResponse = await axios.post(
            `${API}/api/access`,
            {
              resource: "dashboard",
              ...testSignals
            },
            { withCredentials: true }
          );

          setAccess(retryResponse.data);
        }

        setOtp("");
      } else {
        setMfaMessage(response.data.message || "Invalid OTP.");
      }
    } catch (error) {
      setMfaMessage(
        error.response?.data?.message ||
        "OTP verification failed."
      );
    } finally {
      setMfaLoading(false);
    }
  }

  // ==========================================
  // DEVICE MANAGEMENT
  // ==========================================

  async function loadDevices() {
    setDevicesLoading(true);
    setDeviceMessage("");

    try {
      const response = await axios.get(`${API}/api/devices`, {
        withCredentials: true
      });
      setDevices(response.data.devices || []);
    } catch (error) {
      setDeviceMessage(
        error.response?.data?.message || "Could not load devices."
      );
    } finally {
      setDevicesLoading(false);
    }
  }

  useEffect(() => {
    if (activePage === "devices") {
      loadDevices();
    }
  }, [activePage]);

  async function registerNewDevice(e) {
    e.preventDefault();
    setDeviceSubmitting(true);
    setDeviceMessage("");

    try {
      await axios.post(
        `${API}/api/devices/register`,
        deviceForm,
        { withCredentials: true }
      );

      setDeviceMessage("Device registered successfully. It starts as UNTRUSTED.");
      setDeviceForm({
        device_name: "",
        device_type: "Laptop",
        operating_system: "Windows 11"
      });
      await loadDevices();
    } catch (error) {
      setDeviceMessage(
        error.response?.data?.message || "Device registration failed."
      );
    } finally {
      setDeviceSubmitting(false);
    }
  }

  async function changeDeviceTrust(deviceId, trusted) {
    setDeviceMessage("");

    try {
      const response = await axios.post(
        `${API}/api/devices/${deviceId}/trust`,
        { trusted },
        { withCredentials: true }
      );
      setDeviceMessage(response.data.message || "Device trust updated.");
      await loadDevices();
    } catch (error) {
      setDeviceMessage(
        error.response?.data?.message || "Could not update device trust."
      );
    }
  }

  async function removeDevice(deviceId) {
    const confirmed = window.confirm("Remove this registered device?");
    if (!confirmed) return;

    setDeviceMessage("");

    try {
      const response = await axios.delete(
        `${API}/api/devices/${deviceId}`,
        { withCredentials: true }
      );
      setDeviceMessage(response.data.message || "Device removed.");
      await loadDevices();
    } catch (error) {
      setDeviceMessage(
        error.response?.data?.message || "Could not remove device."
      );
    }
  }

  function renderDeviceManagement() {
    const isAdmin = user?.role === "admin";

    return (
      <>
        <header className="topbar">
          <div>
            <h1>Device Management</h1>
            <p>Register devices and manage device trust status</p>
          </div>
        </header>

        <section className="panel">
          <h3><Smartphone /> Register New Device</h3>
          <p>New devices are registered as UNTRUSTED by default.</p>

          <form onSubmit={registerNewDevice}>
            <label>
              Device Name
              <input
                type="text"
                value={deviceForm.device_name}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, device_name: e.target.value })
                }
                placeholder="Example: Veeru Laptop"
                maxLength={100}
                required
              />
            </label>

            <label>
              Device Type
              <select
                value={deviceForm.device_type}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, device_type: e.target.value })
                }
              >
                <option>Laptop</option>
                <option>Desktop</option>
                <option>Mobile</option>
                <option>Tablet</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Operating System
              <input
                type="text"
                value={deviceForm.operating_system}
                onChange={(e) =>
                  setDeviceForm({
                    ...deviceForm,
                    operating_system: e.target.value
                  })
                }
                placeholder="Example: Windows 11"
                maxLength={100}
              />
            </label>

            <button
              className="submit-btn"
              type="submit"
              disabled={deviceSubmitting || !deviceForm.device_name.trim()}
            >
              {deviceSubmitting ? "Registering..." : "Register Device"}
            </button>
          </form>

          {deviceMessage && <p className="message">{deviceMessage}</p>}
        </section>

        <section className="panel">
          <div className="status-row">
            <div>
              <h3><Monitor /> Registered Devices</h3>
              <p>Your account's registered devices</p>
            </div>
            <button
              className="submit-btn"
              type="button"
              onClick={loadDevices}
              disabled={devicesLoading}
            >
              <RefreshCw size={16} />
              {devicesLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {devicesLoading ? (
            <p>Loading devices...</p>
          ) : devices.length === 0 ? (
            <p>No devices registered yet. Register your first device above.</p>
          ) : (
            <div className="device-list">
              {devices.map((device) => (
                <div className="activity-item" key={device.id}>
                  <Smartphone />
                  <div style={{ flex: 1 }}>
                    <strong>{device.device_name}</strong>
                    <small>
                      {device.device_type} · {device.operating_system}
                    </small>
                    <small>
                      Status:{" "}
                      <strong
                        className={
                          device.is_trusted ? "online" : "denied"
                        }
                      >
                        {device.device_status}
                      </strong>
                    </small>
                    <small>Last seen: {device.last_seen || "Not available"}</small>
                  </div>

                  <div className="device-actions">
                    {isAdmin && (
                      <button
                        className="submit-btn"
                        type="button"
                        onClick={() =>
                          changeDeviceTrust(device.id, !Boolean(device.is_trusted))
                        }
                      >
                        {device.is_trusted ? "Revoke Trust" : "Trust Device"}
                      </button>
                    )}

                    {!isAdmin && device.is_trusted && (
                      <button
                        className="submit-btn"
                        type="button"
                        onClick={() => changeDeviceTrust(device.id, false)}
                      >
                        Revoke Trust
                      </button>
                    )}

                    <button
                      className="submit-btn"
                      type="button"
                      onClick={() => removeDevice(device.id)}
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isAdmin && (
            <p className="message">
              Administrator approval is required to mark a device as trusted.
              You can revoke trust or remove your own registered devices.
            </p>
          )}
        </section>
      </>
    );
  }

  const riskColor =
    risk?.risk_level === "HIGH"
      ? "red"
      : risk?.risk_level === "MEDIUM"
        ? "orange"
        : "green";

  function renderMFA() {
    return (
      <section className="panel">
        <h3><KeyRound /> Multi-Factor Authentication</h3>
        <p>Configure and verify your authenticator app.</p>

        <button
          className="submit-btn"
          type="button"
          onClick={setupMFA}
          disabled={mfaLoading}
        >
          {mfaLoading ? "Please wait..." : "Setup MFA"}
        </button>

        {mfaSecret && (
          <div className="mfa-details">
            <h4>Authenticator enrollment</h4>
            <p>Enter this secret in your authenticator app:</p>
            <p className="message">{mfaSecret}</p>

            {provisioningUri && (
              <details>
                <summary>View provisioning URI</summary>
                <p>{provisioningUri}</p>
              </details>
            )}

            <form onSubmit={verifyMFA}>
              <label>
                Six-digit verification code
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, ""))
                  }
                  required
                />
              </label>

              <button
                className="submit-btn"
                type="submit"
                disabled={mfaLoading || otp.length !== 6}
              >
                {mfaLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          </div>
        )}

        {access?.step_up_required && (
          <p className="message">
            Medium risk detected. Verify MFA to retry dashboard access.
          </p>
        )}

        {mfaMessage && <p className="message">{mfaMessage}</p>}
      </section>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2 className="brand">
          <ShieldCheck /> ZeroTrust
        </h2>

        <p className="menu-title">MAIN MENU</p>

        <nav>
          <button
            className={activePage === "overview" ? "active" : ""}
            onClick={() => setActivePage("overview")}
          >
            <LayoutDashboard /> Overview
          </button>

          <button
  className={activePage === "access" ? "active" : ""}
  onClick={() => setActivePage("access")}
>
  <ShieldCheck /> Access Control
</button>

          <button className={activePage === "risk" ? "active" : ""} onClick={() => setActivePage("risk")}>
            <Activity /> Risk Analysis
          </button>

          <button
            className={activePage === "devices" ? "active" : ""}
            onClick={() => setActivePage("devices")}
          >
            <Monitor /> Device Management
          </button>

          <button
  className={activePage === "users" ? "active" : ""}
  onClick={() => setActivePage("users")}
>
  <Users /> Users
</button>

          {user?.role === "admin" && (
            <button
              className={activePage === "admin-devices" ? "active" : ""}
              onClick={() => setActivePage("admin-devices")}
            >
              <ShieldCheck /> Admin Approvals
            </button>
          )}

          <button
            className={activePage === "reports" ? "active" : ""}
            onClick={() => setActivePage("reports")}
          >
            <FileText /> Activity Logs
          </button>

          <button
            className={activePage === "mfa" ? "active" : ""}
            onClick={() => setActivePage("mfa")}
          >
            <KeyRound /> MFA Settings
          </button>
        </nav>

        <button className="logout-btn" onClick={onLogout}>
          <LogOut /> Logout
        </button>
      </aside>

      <main className="main-content">
        {activePage === "users" ? (
          <UsersManagement onBack={() => setActivePage("overview")} />
        ) : activePage === "admin-devices" ? (
          <AdminDeviceApprovals user={user} />
        ) : activePage === "devices" ? (
          renderDeviceManagement()
        ) : activePage === "reports" ? (
          <Reports onBack={() => setActivePage("overview")} user={user} />
        ) : activePage === "mfa" ? (
          <>
            <header className="topbar">
              <div>
                <h1>MFA Settings</h1>
                <p>Multi-Factor Authentication Management</p>
              </div>
            </header>
            {renderMFA()}
          </>
        ) : activePage === "access" ? (
          <>
            <section className="access-control-page">
              <header className="topbar">
                <div>
                  <h1>Access Control</h1>
                  <p>Zero Trust Policy Evaluation and Authorization</p>
                </div>
              </header>

              <div className="access-control-grid">
                <div className="access-control-card">
                  <span className="access-eyebrow">ACCESS DECISION</span>
                  <h2 className={
                    access?.allowed
                      ? "access-allowed"
                      : access?.step_up_required
                        ? "access-stepup"
                        : "access-denied"
                  }>
                    {accessLoading
                      ? "Checking..."
                      : access
                        ? access.allowed
                          ? "ALLOWED"
                          : access.step_up_required
                            ? "MFA REQUIRED"
                            : "DENIED"
                        : "UNAVAILABLE"}
                  </h2>
                  <p>Policy engine decision</p>
                </div>

                <div className="access-control-card">
                  <span className="access-eyebrow">RISK ASSESSMENT</span>
                  <h2>{risk ? `${risk.risk_score}/100` : "--"}</h2>
                  <p>{risk ? risk.risk_level + " Risk" : "Risk unavailable"}</p>
                </div>

                <div className="access-control-card">
                  <span className="access-eyebrow">PROTECTED RESOURCE</span>
                  <h2>Dashboard</h2>
                  <p>Protected application resource</p>
                </div>
              </div>

              <div className="access-control-panel">
                <h2><ShieldCheck /> Policy Decision Point</h2>
                <p className="access-panel-description">
                  Current authorization result from the backend policy evaluation.
                </p>

                <div className="access-detail-row">
                  <span>Authentication</span>
                  <strong className="access-allowed">CONNECTED</strong>
                </div>

                <div className="access-detail-row">
                  <span>Risk Level</span>
                  <strong>{risk?.risk_level || "Pending"}</strong>
                </div>

                <div className="access-detail-row">
                  <span>Risk Score</span>
                  <strong>{risk ? `${risk.risk_score}/100` : "--"}</strong>
                </div>

                <div className="access-detail-row">
                  <span>Policy Decision</span>
                  <strong className={
                    access?.allowed
                      ? "access-allowed"
                      : access?.step_up_required
                        ? "access-stepup"
                        : "access-denied"
                  }>
                    {accessLoading
                      ? "Checking..."
                      : access
                        ? access.allowed
                          ? "ALLOWED"
                          : access.step_up_required
                            ? "STEP-UP REQUIRED"
                            : "DENIED"
                        : "--"}
                  </strong>
                </div>

                <div className="access-reason">
                  <span className="access-eyebrow">DECISION REASON</span>
                  <p>
                    {access
                      ? access.reason
                      : accessError || "Waiting for policy evaluation"}
                  </p>
                </div>

                {access?.step_up_required && (
                  <button
                    className="submit-btn"
                    onClick={() => setActivePage("mfa")}
                  >
                    <KeyRound size={18} /> Verify MFA
                  </button>
                )}

                <div className="access-security-note">
                  <Lock size={18} />
                  <span>Zero Trust: Verify every request. Apply least privilege.</span>
                </div>
              </div>
            </section>
          </>
        ) : activePage === "risk" ? (
          <>
            <section className="risk-analysis-page">
  <header className="topbar">
    <div>
      <h1>Risk Analysis</h1>
      <p>Security Risk Monitoring and Assessment</p>
    </div>
  </header>

  {riskLoading ? (
    <p>Evaluating security risk...</p>
  ) : riskError ? (
    <p>{riskError}</p>
  ) : risk ? (
    <div className="risk-dashboard">

      <div className="risk-overview-card">
        <div className="risk-card-heading">
          <div>
            <span className="risk-eyebrow">CURRENT ASSESSMENT</span>
            <h2>Security Risk Score</h2>
          </div>
          <span className={`risk-level-pill ${String(risk.risk_level || "LOW").toLowerCase()}`}>
            {risk.risk_level}
          </span>
        </div>

        <div className="risk-gauge-layout">
          <div
            className={`risk-gauge ${String(risk.risk_level || "LOW").toLowerCase()}`}
            style={{
              "--risk-angle": `${Math.min(100, Math.max(0, Number(risk.risk_score) || 0)) * 3.6}deg`
            }}
          >
            <div className="risk-gauge-inner">
              <strong>{risk.risk_score}</strong>
              <span>OUT OF 100</span>
            </div>
          </div>

          <div className="risk-gauge-copy">
            <h3>{risk.risk_level} RISK</h3>
            <p>
              Current risk score calculated by the Zero Trust risk engine.
            </p>

            <div className="risk-meter-track">
              <div
                className={`risk-meter-fill ${String(risk.risk_level || "LOW").toLowerCase()}`}
                style={{
                  width: `${Math.min(100, Math.max(0, Number(risk.risk_score) || 0))}%`
                }}
              />
            </div>

            <div className="risk-scale-labels">
              <span>0 - LOW</span>
              <span>100 - HIGH</span>
            </div>
          </div>
        </div>
      </div>

      <div className="risk-side-card">
        <span className="risk-eyebrow">SECURITY RESPONSE</span>
        <h3>Recommended Action</h3>

        {risk.risk_level === "LOW" ? (
          <p>
            Maintain trusted device and location status.
            Continue monitoring access requests.
          </p>
        ) : risk.risk_level === "MEDIUM" ? (
          <p>
            Require MFA step-up verification and review the
            device and location trust signals before granting access.
          </p>
        ) : (
          <p>
            High risk detected. Deny protected access and review
            device trust, location trust and failed login attempts.
          </p>
        )}

        <div className="risk-response-note">
          <strong>Zero Trust Principle</strong>
          <span>Never trust automatically. Verify every access request.</span>
        </div>
      </div>

      <div className="risk-detail-grid">

        <div className="risk-detail-card">
          <span className="risk-eyebrow">SCORING MODEL</span>
          <h3>Risk Factor Breakdown</h3>
          <p className="risk-description">
            Configured maximum contribution of each risk factor.
            These are scoring weights, not live per-factor status values.
          </p>

          <div className="risk-factor-row">
            <div>
              <strong>Untrusted Device</strong>
              <span>Device trust validation</span>
            </div>
            <strong className="factor-value">+40</strong>
          </div>

          <div className="risk-factor-row">
            <div>
              <strong>Untrusted Location</strong>
              <span>Location trust validation</span>
            </div>
            <strong className="factor-value">+30</strong>
          </div>

          <div className="risk-factor-row">
            <div>
              <strong>Failed Login Attempts</strong>
              <span>Three or more failed attempts</span>
            </div>
            <strong className="factor-value">+30</strong>
          </div>
        </div>

        <div className="risk-detail-card">
          <span className="risk-eyebrow">RISK CLASSIFICATION</span>
          <h3>Risk Level Guide</h3>

          <div className="risk-guide-row">
            <span className="risk-guide-dot low-dot"></span>
            <div>
              <strong>LOW</strong>
              <span>Score: 0–29</span>
            </div>
            <span className="risk-guide-action">Normal monitoring</span>
          </div>

          <div className="risk-guide-row">
            <span className="risk-guide-dot medium-dot"></span>
            <div>
              <strong>MEDIUM</strong>
              <span>Score: 30–59</span>
            </div>
            <span className="risk-guide-action">MFA required</span>
          </div>

          <div className="risk-guide-row">
            <span className="risk-guide-dot high-dot"></span>
            <div>
              <strong>HIGH</strong>
              <span>Score: 60–100</span>
            </div>
            <span className="risk-guide-action">Deny access</span>
          </div>
        </div>

      </div>

      <div className="risk-footer-note">
        Risk assessment is based on device trust, location trust
        and failed authentication attempts.
      </div>

    </div>
  ) : (
    <p>Risk evaluation is pending.</p>
  )}
</section>
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                

            <h1>Security Dashboard</h1>
                <p>Zero Trust Network Access Management</p>
              </div>

              <div className="profile">
                <div className="avatar">
                  {(user?.username || user?.email || "U")[0].toUpperCase()}
                </div>
                <div className="profile-details">
                  <span>{user?.username || user?.email || "User"}</span>
                  {user?.role === "admin" && (
                    <span className="admin-badge">ADMIN</span>
                  )}
                </div>
              </div>
            </header>

            <section className="welcome">
              <div>
                <h2>Welcome back, {user?.username || "User"}!</h2>
                <p>Your security overview is ready.</p>
              </div>
              <ShieldCheck size={45} />
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <ShieldCheck className="stat-icon green" />
                <p>Security Status</p>
                <h2>Active</h2>
                <span>Authentication connected</span>
              </div>

              <div className="stat-card">
                <Activity className="stat-icon blue" />
                <p>Risk Score</p>
                <h2>
                  {riskLoading
                    ? "Loading..."
                    : risk
                      ? `${risk.risk_score}/100`
                      : "--"}
                </h2>
                <span className={risk ? riskColor : ""}>
                  {risk
                    ? `Risk Level: ${risk.risk_level}`
                    : riskError || "Waiting for evaluation"}
                </span>
              </div>

              <div className="stat-card">
                <Monitor className="stat-icon purple" />
                <p>Device Trust</p>
                <h2>Test Signal</h2>
                <span>Trusted input used for demo</span>
              </div>

              <div className="stat-card">
                <MapPin className="stat-icon orange" />
                <p>Location Trust</p>
                <h2>Test Signal</h2>
                <span>Trusted input used for demo</span>
              </div>
            </section>

            <section className="bottom-grid">
              <div className="panel">
                <h3><Lock /> Access Control</h3>
                <p>Policy Engine evaluation</p>

                <div className="status-row">
                  <span>Policy Engine</span>
                  <span className={
                    accessLoading
                      ? "pending"
                      : access?.allowed
                        ? "online"
                        : "denied"
                  }>
                    {accessLoading
                      ? "Checking..."
                      : access
                        ? access.allowed
                          ? "AVAILABLE"
                          : access.step_up_required
                            ? "MFA REQUIRED"
                            : "ACCESS DENIED"
                        : "Unavailable"}
                  </span>
                </div>

                <div className="status-row">
                  <span>Access Decision</span>
                  <strong className={access?.allowed ? "online" : "denied"}>
                    {accessLoading
                      ? "Loading..."
                      : access
                        ? access.allowed
                          ? "ALLOWED"
                          : access.step_up_required
                            ? "STEP-UP REQUIRED"
                            : "DENIED"
                        : "--"}
                  </strong>
                </div>

                <div className="status-row">
                  <span>Decision Reason</span>
                </div>

                <p>
                  {access
                    ? access.reason
                    : accessError || "Waiting for policy evaluation"}
                </p>

                <div className="status-row">
                  <span>Authentication</span>
                  <span className="online">Connected</span>
                </div>

                {access?.step_up_required && (
                  <button
                    className="submit-btn"
                    onClick={() => setActivePage("mfa")}
                  >
                    <KeyRound size={18} /> Verify MFA
                  </button>
                )}
              </div>

              <div className="panel">
                <h3><ShieldAlert /> Security Activity</h3>
                <p>Security monitoring overview</p>

                <div className="activity-item">
                  <ShieldCheck />
                  <div>
                    <strong>Login successful</strong>
                    <small>User authenticated</small>
                  </div>
                </div>

                <div className="activity-item">
                  <Activity />
                  <div>
                    <strong>Risk evaluation</strong>
                    <small>
                      {risk
                        ? `${risk.risk_level} risk detected`
                        : riskError || "Evaluation pending"}
                    </small>
                  </div>
                </div>

                <div className="activity-item">
                  <Lock />
                  <div>
                    <strong>Access policy</strong>
                    <small>
                      {access
                        ? access.reason
                        : accessError || "Evaluation pending"}
                    </small>
                  </div>
                </div>
              </div>
            </section>

            <footer>
              ZeroTrust-ZTNA | Secure Access Management
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
