import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ShieldCheck, ShieldOff, RefreshCw, Laptop, AlertCircle } from "lucide-react";

const API = "http://localhost:5000";

function AdminDeviceApprovals({ user }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  const loadDevices = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      setError("Administrator access required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API}/api/admin/devices`, {
        withCredentials: true
      });
      setDevices(response.data.devices || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not load registered devices. Check your admin session and backend."
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  async function updateTrust(device, trusted) {
    setBusyId(device.id);
    setMessage("");
    setError("");

    try {
      await axios.post(
        `${API}/api/devices/${device.id}/trust`,
        { trusted },
        { withCredentials: true }
      );

      setMessage(
        trusted
          ? `${device.device_name} approved successfully.`
          : `${device.device_name} trust revoked.`
      );

      await loadDevices();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not update device trust."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) {
    return (
      <section className="panel">
        <h2>Admin Device Approval</h2>
        <p className="message">Administrator access required.</p>
      </section>
    );
  }

  const pendingCount = devices.filter(
    (device) => !device.is_trusted
  ).length;

  return (
    <section className="admin-device-page">
      <header className="topbar">
        <div>
          <h1>Admin Device Approval</h1>
          <p>Review registered devices and manage trust status.</p>
        </div>

        <button
          type="button"
          className="submit-btn"
          onClick={loadDevices}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <Laptop className="stat-icon blue" />
          <p>Total Devices</p>
          <h2>{devices.length}</h2>
        </div>
        <div className="stat-card">
          <AlertCircle className="stat-icon orange" />
          <p>Pending Approval</p>
          <h2>{pendingCount}</h2>
        </div>
        <div className="stat-card">
          <ShieldCheck className="stat-icon green" />
          <p>Trusted Devices</p>
          <h2>{devices.length - pendingCount}</h2>
        </div>
      </div>

      {message && <p className="message">{message}</p>}
      {error && <p className="message">{error}</p>}

      <div className="panel">
        <h3>All Registered Devices</h3>
        <p>Only administrators can approve devices for trust.</p>

        {loading ? (
          <p>Loading devices...</p>
        ) : devices.length === 0 ? (
          <p>No registered devices found.</p>
        ) : (
          <div className="admin-device-list">
            {devices.map((device) => {
              const trusted = Boolean(device.is_trusted);

              return (
                <article className="panel" key={device.id}>
                  <div className="status-row">
                    <div>
                      <strong>{device.device_name}</strong>
                      <p>
                        Owner: {device.username} · {device.device_type || "Unknown"}
                      </p>
                      <small>
                        {device.operating_system || "Unknown OS"} · Last seen:{" "}
                        {device.last_seen || "Not available"}
                      </small>
                    </div>

                    <strong className={trusted ? "online" : "pending"}>
                      {trusted ? "TRUSTED" : "UNTRUSTED"}
                    </strong>
                  </div>

                  <div className="status-row">
                    {trusted ? (
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={() => updateTrust(device, false)}
                        disabled={busyId === device.id}
                      >
                        <ShieldOff size={16} />
                        {busyId === device.id ? "Updating..." : "Revoke Trust"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={() => updateTrust(device, true)}
                        disabled={busyId === device.id}
                      >
                        <ShieldCheck size={16} />
                        {busyId === device.id ? "Approving..." : "Approve Device"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminDeviceApprovals;
