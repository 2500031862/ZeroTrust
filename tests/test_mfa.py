
from auth.mfa import (
    generate_mfa_secret,
    generate_otp,
    verify_otp
)


def test_mfa_verification():
    secret = generate_mfa_secret()

    otp = generate_otp(secret)

    assert verify_otp(secret, otp) is True


def test_invalid_otp():
    secret = generate_mfa_secret()

    assert verify_otp(secret, "000000") is False
