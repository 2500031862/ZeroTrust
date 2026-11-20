
import { useEffect, useState } from "react";
import axios from "axios";

import {
  FileText,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Lock,
  Activity,
  Clock,
  User,
  ShieldAlert
} from "lucide-react";

import "./Reports.css";

const API = "";

function Reports({ onBack, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);

  async function fetchReports() {
    setLoading(true);
    setError("");
    setStatus(null);

    try {
      const response = await axios.get(
        `${API}/api/reports`,
        { withCredentials: true }
      );

      setReports(response.data.reports || []);
      setStatus(response.status);

    } catch (err) {
      setReports([]);
      setStatus(err.response?.status || null);

      setError(
        err.response?.data?.reason ||
        err.response?.data?.message ||
        "Unable to load security events"
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  // Convert SQLite UTC timestamp into Indian Standard Time
  const formatDate = (dateString) => {
    if (!dateString) return "Date unavailable";

    // SQLite CURRENT_TIMESTAMP format: YYYY-MM-DD HH:MM:SS
    const normalizedDate = dateString.includes("T")
      ? dateString
      : dateString.replace(" ", "T");

    // SQLite CURRENT_TIMESTAMP is UTC.
    // Add Z only when the timestamp has no timezone information.
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(normalizedDate);

    const utcDate = new Date(
      hasTimezone ? normalizedDate : normalizedDate + "Z"
    );

    if (Number.isNaN(utcDate.getTime())) {
      return "Invalid date";
    }

    return utcDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  const getDecisionClass = (decision) => {
    const value = (decision || "").toUpperCase();

    if (["ALLOWED", "ALLOW"].includes(value)) {
      return "online";
    }

    if (["DENIED", "DENY"].includes(value)) {
      return "denied";
    }

    return "pending";
  };

  return (
    <div className="reports-page">

      <header className="reports-header">
        <div>
          <h1>Activity Logs & Reports</h1>
          <p>Real-time security events from the ZeroTrust database</p>
        </div>

        <div className="reports-user">
          <ShieldCheck size={22} />
          {user?.username || user?.email || "User"}
        </div>
      </header>

      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <section className="reports-summary">

        <div className="report-summary-card">
          <FileText size={28} />
          <div>
            <p>Total Security Events</p>
            <h2>{reports.length}</h2>
          </div>
        </div>

        <div className="report-summary-card">
          <Lock size={28} />
          <div>
            <p>Resource</p>
            <h2>Protected</h2>
          </div>
        </div>

        <div className="report-summary-card">
          <ShieldCheck size={28} />
          <div>
            <p>API Status</p>
            <h2>
              {status === 200
                ? "Connected"
                : loading
                  ? "Checking..."
                  : "Restricted"}
            </h2>
          </div>
        </div>

      </section>

      <section className="reports-panel">

        <div className="reports-panel-header">
          <div>
            <h2>
              <Activity size={22} />
              Security Event History
            </h2>
            <p>
              Database source: SQLite | API: /api/reports | Timezone: IST
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {loading && (
          <div className="reports-message">
            Loading security events...
          </div>
        )}

        {!loading && error && (
          <div className="reports-error">
            <AlertCircle size={25} />
            <div>
              <strong>Unable to load activity logs</strong>
              <p>{error}</p>
              <small>
                HTTP Status: {status || "Connection error"}
              </small>
            </div>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="reports-message">
            No security events found in the database.
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="reports-list">

            {reports.map((report) => {
              const decision =
                report.status || report.decision || "RECORDED";

              return (
                <article
                  className="report-item"
                  key={report.id}
                >

                  <div className="report-icon">
                    {String(decision).toUpperCase().includes("DEN") ? (
                      <ShieldAlert size={24} />
                    ) : (
                      <FileText size={24} />
                    )}
                  </div>

                  <div className="report-details">

                    <h3>
                      {report.title || report.event_type || "Security Event"}
                    </h3>

                    <p>Event ID: {report.id}</p>

                    <p>
                      <User size={14} />
                      User: {report.username || user?.username || "Unknown"}
                    </p>

                    <p>
                      <Lock size={14} />
                      Resource: {report.resource || "N/A"}
                    </p>

                    <p>
                      <Clock size={14} />
                      {formatDate(report.created_at)}
                    </p>

                    <p>
                      Reason: {report.reason || "No reason recorded"}
                    </p>

                    <p>
                      Risk Level: {report.risk_level || "Not recorded"}
                    </p>

                  </div>

                  <span
                    className={`report-status ${getDecisionClass(decision)}`}
                  >
                    {decision}
                  </span>

                </article>
              );
            })}

          </div>
        )}

      </section>

      <footer className="reports-footer">
        ZeroTrust-ZTNA | Security Audit & Activity Monitoring
      </footer>

    </div>
  );
}

export default Reports;
