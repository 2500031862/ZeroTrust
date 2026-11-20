
from uuid import uuid4

from auth.authentication import register_user, login_user


def test_user_registration():
    unique_id = uuid4().hex[:8]

    username = f"veeru_test_{unique_id}"
    email = f"veeru_test_{unique_id}@example.com"
    password = "TestPassword123!"

    success, message = register_user(
        username,
        email,
        password
    )

    assert success is True
    assert message == "Registration successful"


def test_user_login():
    unique_id = uuid4().hex[:8]

    username = f"login_test_{unique_id}"
    email = f"login_test_{unique_id}@example.com"
    password = "TestPassword123!"

    # Register user before login
    success, message = register_user(
        username,
        email,
        password
    )

    assert success is True

    # Test login
    success, user = login_user(email, password)

    assert success is True
    assert user["username"] == username


def test_wrong_password():
    unique_id = uuid4().hex[:8]

    username = f"wrong_test_{unique_id}"
    email = f"wrong_test_{unique_id}@example.com"
    password = "TestPassword123!"

    # Register user
    success, message = register_user(
        username,
        email,
        password
    )

    assert success is True

    # Test incorrect password
    success, result = login_user(
        email,
        "WrongPassword123!"
    )

    assert success is False
    assert result == "Invalid email or password"
