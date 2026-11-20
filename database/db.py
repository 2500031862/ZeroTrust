import sqlite3
from pathlib import Path

# ==========================================
# DATABASE CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "zerotrust.db"


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


# ==========================================
# DATABASE INITIALIZATION
# ==========================================

def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS security_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT, event_type TEXT NOT NULL, resource TEXT,
                decision TEXT, reason TEXT, risk_level TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS mfa_secrets (
                username TEXT PRIMARY KEY, secret TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL, device_name TEXT NOT NULL,
                device_type TEXT DEFAULT 'Unknown',
                operating_system TEXT DEFAULT 'Unknown',
                device_status TEXT DEFAULT 'UNTRUSTED',
                is_trusted INTEGER DEFAULT 0,
                last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
                UNIQUE(username, device_name)
            )
        """)
        connection.execute("CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_security_events_username ON security_events(username)")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_devices_username ON devices(username)")
    print("Database initialized successfully!")


# ==========================================
# SECURITY EVENT FUNCTIONS
# ==========================================

def log_security_event(username, event_type, resource=None, decision=None, reason=None, risk_level=None):
    with get_connection() as connection:
        connection.execute("""
            INSERT INTO security_events (username, event_type, resource, decision, reason, risk_level)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (username, event_type, resource, decision, reason, risk_level))


def get_security_events(limit=100, username=None):
    limit = max(1, min(int(limit), 500))
    with get_connection() as connection:
        if username:
            rows = connection.execute("SELECT * FROM security_events WHERE username = ? ORDER BY id DESC LIMIT ?", (username, limit)).fetchall()
        else:
            rows = connection.execute("SELECT * FROM security_events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


# ==========================================
# MFA FUNCTIONS
# ==========================================

def save_mfa_secret(username, secret):
    with get_connection() as connection:
        connection.execute("""
            INSERT INTO mfa_secrets (username, secret) VALUES (?, ?)
            ON CONFLICT(username) DO UPDATE SET secret = excluded.secret
        """, (username, secret))


def get_mfa_secret(username):
    with get_connection() as connection:
        row = connection.execute("SELECT secret FROM mfa_secrets WHERE username = ?", (username,)).fetchone()
    return row["secret"] if row else None


# ==========================================
# DEVICE MANAGEMENT FUNCTIONS
# ==========================================

def register_device(username, device_name, device_type="Unknown", operating_system="Unknown"):
    with get_connection() as connection:
        connection.execute("""
            INSERT INTO devices (username, device_name, device_type, operating_system)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(username, device_name) DO UPDATE SET
                device_type = excluded.device_type,
                operating_system = excluded.operating_system,
                last_seen = CURRENT_TIMESTAMP
        """, (username, device_name, device_type, operating_system))
    return True


def get_user_devices(username):
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM devices WHERE username = ? ORDER BY id DESC", (username,)).fetchall()
    return [dict(row) for row in rows]


def get_user_trusted_device(username):
    """Return the newest trusted device for a user, or None if none is trusted.

    This is a user-level demo posture check; bind a device ID to each login
    session for production-grade per-device identification.
    """
    with get_connection() as connection:
        row = connection.execute("""
            SELECT id, username, device_name, device_type, operating_system,
                   device_status, is_trusted, last_seen
            FROM devices
            WHERE username = ? AND is_trusted = 1 AND device_status = 'TRUSTED'
            ORDER BY last_seen DESC, id DESC LIMIT 1
        """, (username,)).fetchone()
    return dict(row) if row else None


def get_all_devices():
    """Return all registered devices; call only from an admin-authorized API."""
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM devices ORDER BY id DESC").fetchall()
    return [dict(row) for row in rows]


def update_device_trust(device_id, username, trusted, is_admin=False):
    status = "TRUSTED" if trusted else "UNTRUSTED"
    if trusted and not is_admin:
        return False
    with get_connection() as connection:
        if is_admin:
            cursor = connection.execute("""
                UPDATE devices SET is_trusted = ?, device_status = ?, last_seen = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (int(bool(trusted)), status, device_id))
        else:
            cursor = connection.execute("""
                UPDATE devices SET is_trusted = 0, device_status = 'UNTRUSTED', last_seen = CURRENT_TIMESTAMP
                WHERE id = ? AND username = ?
            """, (device_id, username))
    return cursor.rowcount > 0


def delete_device(device_id, username):
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM devices WHERE id = ? AND username = ?", (device_id, username))
    return cursor.rowcount > 0


if __name__ == "__main__":
    init_db()

def get_all_users():
    """Return safe user profile fields for administrator management."""
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, username, email, role FROM users ORDER BY id ASC"
        ).fetchall()
    return [dict(row) for row in rows]