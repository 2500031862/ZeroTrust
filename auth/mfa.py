
import pyotp


def generate_mfa_secret():
    """Generate a unique MFA secret."""
    return pyotp.random_base32()


def generate_otp(secret):
    """Generate a time-based OTP."""
    totp = pyotp.TOTP(secret)
    return totp.now()


def verify_otp(secret, otp):
    """Verify a time-based OTP safely."""

    if not secret or not otp:
        return False

    otp = str(otp).strip()

    if not otp.isdigit() or len(otp) != 6:
        return False

    totp = pyotp.TOTP(secret)

    return totp.verify(otp, valid_window=0)
