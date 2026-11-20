import React, { useEffect, useState } from "react";

export default function UsersManagement({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/users",
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load users");
      }

      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div style={{ padding: "25px", color: "#f8fafc" }}>
      <header style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "15px"
      }}>
        <div>
          <h1>User Management</h1>
          <p style={{ color: "#94a3b8" }}>
            Administrator User Directory
          </p>
        </div>
        <button onClick={onBack} style={buttonStyle}>
          Back to Overview
        </button>
      </header>

      <div style={{
        marginTop: "25px", padding: "22px",
        background: "#172033", borderRadius: "15px",
        border: "1px solid #334155"
      }}>
        <h2>{users.length}</h2>
        <p style={{ color: "#94a3b8" }}>Registered Users</p>
        <button onClick={loadUsers} style={buttonStyle}>
          Refresh Users
        </button>
      </div>

      <div style={{
        marginTop: "22px", padding: "22px",
        background: "#172033", borderRadius: "15px",
        overflowX: "auto"
      }}>
        <h3>Registered Accounts</h3>

        {loading && <p>Loading users...</p>}

        {error && (
          <p style={{ color: "#f87171" }}>
            {error}
          </p>
        )}

        {!loading && !error && users.length === 0 && (
          <p>No users found.</p>
        )}

        {!loading && !error && users.length > 0 && (
          <table style={{
            width: "100%", borderCollapse: "collapse",
            textAlign: "left", marginTop: "18px"
          }}>
            <thead>
              <tr style={{ color: "#94a3b8" }}>
                <th style={cellStyle}>ID</th>
                <th style={cellStyle}>Username</th>
                <th style={cellStyle}>Email</th>
                <th style={cellStyle}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td style={cellStyle}>{item.id}</td>
                  <td style={cellStyle}>{item.username}</td>
                  <td style={cellStyle}>{item.email}</td>
                  <td style={cellStyle}>
                    <span style={{
                      color: item.role === "admin" ? "#60a5fa" : "#4ade80",
                      fontWeight: "bold"
                    }}>
                      {item.role?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const cellStyle = {
  padding: "14px 10px",
  borderBottom: "1px solid #334155",
  fontSize: "13px",
  color: "#e2e8f0"
};

const buttonStyle = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};