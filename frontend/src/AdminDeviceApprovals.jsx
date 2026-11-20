import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AdminDeviceApprovals.css";
import {
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Laptop,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Server,
  Search,
  Shield,
  Wifi,
} from "lucide-react";
import "./AdminDeviceApprovals.css";

const API = "";
const isTrustedDevice = (device) =>
  device?.is_trusted === true || device?.is_trusted === 1 || device?.is_trusted === "1";

function AdminDeviceApprovals({ user }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "admin";

  const loadDevices = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      setError("Administrator access is required to view all devices.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API}/api/admin/devices`, {
        withCredentials: true,
      });
      setDevices(response.data.devices || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
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
          ? `${device.device_name || "Device"} approved successfully.`
          : `${device.device_name || "Device"} trust revoked successfully.`
      );
      await loadDevices();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not update device trust. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  const trustedCount = devices.filter(isTrustedDevice).length;
  const pendingCount = devices.length - trustedCount;

  const visibleDevices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return devices.filter((device) => {
      const trusted = isTrustedDevice(device);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "TRUSTED" && trusted) ||
        (filter === "PENDING" && !trusted);
      const matchesSearch =
        !term ||
        [device.device_name, device.username, device.device_type, device.operating_system]
          .some((value) => String(value || "").toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [devices, filter, search]);

  if (!isAdmin) {
    return (
      <section className="zta-page">
        <div className="zta-alert zta-alert-error">
          <AlertCircle size={19} /> Administrator access required.
        </div>
      </section>
    );
  }

  return (
    <section className="zta-page">
      <div className="zta-hero">
        <div className="zta-hero-copy">
          <div className="zta-eyebrow"><Shield size={14} /> ZERO TRUST CONTROL CENTER</div>
          <h1>Device approvals</h1>
          <p>Review registered endpoints and manage device trust across your network.</p>
          <div className="zta-admin-chip"><ShieldCheck size={14} /> Administrator view</div>
        </div>
        <div className="zta-hero-art" aria-hidden="true">
          <div className="zta-orbit zta-orbit-one" />
          <div className="zta-orbit zta-orbit-two" />
          <div className="zta-shield"><ShieldCheck size={48} strokeWidth={1.5} /></div>
          <span className="zta-art-dot zta-dot-one" />
          <span className="zta-art-dot zta-dot-two" />
        </div>
        <button className="zta-refresh" type="button" onClick={loadDevices} disabled={loading}>
          <RefreshCw size={16} className={loading ? "zta-spin" : ""} />
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <div className="zta-stats">
        <article className="zta-stat-card">
          <div className="zta-stat-icon zta-icon-blue"><Monitor size={21} /></div>
          <div><span>Total devices</span><strong>{devices.length}</strong><small>Registered endpoints</small></div>
          <div className="zta-stat-mark"><Server size={35} /></div>
        </article>
        <article className="zta-stat-card">
          <div className="zta-stat-icon zta-icon-amber"><Clock3 size={21} /></div>
          <div><span>Untrusted devices</span><strong>{pendingCount}</strong><small>Require review</small></div>
          <div className="zta-stat-mark"><AlertCircle size={35} /></div>
        </article>
        <article className="zta-stat-card">
          <div className="zta-stat-icon zta-icon-green"><ShieldCheck size={21} /></div>
          <div><span>Trusted devices</span><strong>{trustedCount}</strong><small>Approved endpoints</small></div>
          <div className="zta-stat-mark"><Wifi size={35} /></div>
        </article>
      </div>

      {message && <div className="zta-alert zta-alert-success"><CheckCircle2 size={18} />{message}</div>}
      {error && <div className="zta-alert zta-alert-error"><AlertCircle size={18} />{error}<button type="button" onClick={loadDevices}>Try again</button></div>}

      <div className="zta-list-panel">
        <div className="zta-list-heading">
          <div>
            <h2>Registered devices</h2>
            <p>Approve trusted devices or revoke access when needed.</p>
          </div>
          <span className="zta-count-pill">{visibleDevices.length} shown</span>
        </div>

        <div className="zta-toolbar">
          <div className="zta-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search device, owner or OS..." /></div>
          <div className="zta-filters" role="group" aria-label="Filter devices">
            {["ALL", "PENDING", "TRUSTED"].map((item) => (
              <button key={item} type="button" className={filter === item ? "zta-filter active" : "zta-filter"} onClick={() => setFilter(item)}>
                {item === "ALL" ? "All" : item === "PENDING" ? "Untrusted" : "Trusted"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="zta-empty"><RefreshCw className="zta-spin" size={25} /><strong>Loading devices</strong><span>Fetching registered endpoints...</span></div>
        ) : visibleDevices.length === 0 ? (
          <div className="zta-empty"><Monitor size={28} /><strong>No devices found</strong><span>Try changing your search or filter.</span></div>
        ) : (
          <div className="zta-device-list">
            {visibleDevices.map((device) => {
              const trusted = isTrustedDevice(device);
              const DeviceIcon = /mobile|phone|tablet/i.test(device.device_type || "") ? Smartphone : /laptop/i.test(device.device_type || "") ? Laptop : Monitor;
              return (
                <article className="zta-device-row" key={device.id}>
                  <div className="zta-device-symbol"><DeviceIcon size={23} /></div>
                  <div className="zta-device-main">
                    <div className="zta-device-title-line"><h3>{device.device_name || "Unnamed device"}</h3><span className={trusted ? "zta-status zta-status-trusted" : "zta-status zta-status-pending"}><span />{trusted ? "TRUSTED" : "UNTRUSTED"}</span></div>
                    <div className="zta-device-meta">
                      <span><strong>Owner</strong> {device.username || "Unknown"}</span>
                      <span>{device.device_type || "Unknown type"}</span>
                      <span>{device.operating_system || "Unknown OS"}</span>
                    </div>
                    <div className="zta-last-seen"><Clock3 size={13} /> Last seen: {device.last_seen || "Not available"}</div>
                  </div>
                  <div className="zta-device-action">
                    {trusted ? (
                      <button className="zta-action zta-action-revoke" type="button" onClick={() => updateTrust(device, false)} disabled={busyId === device.id}>
                        <ShieldOff size={16} />{busyId === device.id ? "Updating..." : "Revoke trust"}
                      </button>
                    ) : (
                      <button className="zta-action zta-action-approve" type="button" onClick={() => updateTrust(device, true)} disabled={busyId === device.id}>
                        <ShieldCheck size={16} />{busyId === device.id ? "Approving..." : "Approve device"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="zta-panel-footer"><ShieldCheck size={14} /> Every approval change is processed by the server-side authorization route.</div>
      </div>
    </section>
  );
}

export default AdminDeviceApprovals;
