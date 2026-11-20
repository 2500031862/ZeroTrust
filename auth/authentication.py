
from werkzeug.security import generate_password_hash, check_password_hash
from database.db import get_connection


def register_user(username, email, password):

    # Validate input
    username = username.strip()
    email = email.strip().lower()

    if not username or not email or not password:
        return False, "All fields are required"

    if len(password) < 8:
        return False, "Password must be at least 8 characters"

    password_hash = generate_password_hash(password)

    try:
        with get_connection() as conn:

            # Check whether username or email already exists
            existing_user = conn.execute(
                """
                SELECT id FROM users
                WHERE username = ? OR email = ?
                """,
                (username, email)
            ).fetchone()

            if existing_user:
                return False, "Username or email already exists"

            # Insert new user
            conn.execute(
                """
                INSERT INTO users
                (username, email, password_hash)
                VALUES (?, ?, ?)
                """,
                (username, email, password_hash)
            )

        return True, "Registration successful"

    except Exception as error:
        print("Registration Error:", error)
        return False, "Registration failed"


def login_user(email, password):

    if not email or not password:
        return False, "Email and password are required"

    with get_connection() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.strip().lower(),)
        ).fetchone()

    if user is None:
        return False, "Invalid email or password"

    if not check_password_hash(user["password_hash"], password):
        return False, "Invalid email or password"

    return True, {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"]
    }
