
import { useState } from "react";
import axios from "axios";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  KeyRound
} from "lucide-react";

import Dashboard from "./Dashboard";
import "./App.css";

const API = "http://10.123.55.174:5000";
axios.defaults.withCredentials = true;

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [otp, setOtp] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/api/${isLogin ? "login" : "register"}`,
        isLogin
          ? { email, password }
          : { username, email, password },
        { withCredentials: true }
      );

      setMessage(response.data.message);

      if (isLogin && response.data.success) {
        setLoggedInUser(response.data.user);
      }

      if (!isLogin && response.data.success) {
        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Unable to connect to server"
      );
    } finally {
      setLoading(false);
    }
  }

  async function setupMFA() {
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/api/mfa/setup`,
        {},
        { withCredentials: true }
      );

      setMfaSecret(response.data.secret);
      setMfaRequired(true);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "MFA setup failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyMFA(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/api/mfa/verify`,
        { otp },
        { withCredentials: true }
      );

      if (response.data.success) {
        setMfaRequired(false);
        setOtp("");
        setMessage("MFA verification successful");
      } else {
        setMessage(response.data.message || "Invalid OTP");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await axios.post(
        `${API}/api/logout`,
        {},
        { withCredentials: true }
      );

      setLoggedInUser(null);
      setMfaRequired(false);
      setMfaSecret("");
      setOtp("");
      setEmail("");
      setPassword("");
      setMessage("Logged out successfully");
    } catch {
      setMessage("Logout failed. Please try again.");
    }
  }

  if (loggedInUser) {
    if (mfaRequired) {
      return (
        <div className="app">
          <nav className="navbar">
            <div className="brand">
              <ShieldCheck size={32} />
              <span>
                ZeroTrust<span className="blue">.ZTNA</span>
              </span>
            </div>
            <span className="secure-label">
              MULTI-FACTOR AUTHENTICATION
            </span>
          </nav>

          <main className="main">
            <section className="auth-card">
              <div className="icon-box">
                <KeyRound size={40} />
              </div>

              <h2>Verify Your Identity</h2>
              <p className="subheading">
                Complete MFA enrollment using an authenticator app.
              </p>

              <button
                className="submit-btn"
                type="button"
                onClick={setupMFA}
                disabled={loading}
              >
                {loading ? "Please wait..." : "Setup MFA"}
              </button>

              {mfaSecret && (
                <>
                  <p>
                    Add this secret to your authenticator app:
                  </p>
                  <p className="message">{mfaSecret}</p>

                  <form onSubmit={verifyMFA}>
                    <label>
                      Enter 6-digit OTP
                      <div className="input-box">
                        <KeyRound size={18} />
                        <input
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Enter OTP"
                          value={otp}
                          onChange={(e) =>
                            setOtp(
                              e.target.value.replace(/\D/g, "")
                            )
                          }
                          required
                        />
                      </div>
                    </label>

                    <button
                      className="submit-btn"
                      type="submit"
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify OTP"}
                      <ArrowRight size={19} />
                    </button>
                  </form>
                </>
              )}

              {message && <p className="message">{message}</p>}
            </section>
          </main>
        </div>
      );
    }

    return (
      <Dashboard
        user={loggedInUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="brand">
          <ShieldCheck size={32} />
          <span>
            ZeroTrust<span className="blue">.ZTNA</span>
          </span>
        </div>
        <span className="secure-label">
          SECURE ACCESS PLATFORM
        </span>
      </nav>

      <main className="main">
        <section className="hero">
          <div className="icon-box">
            <ShieldCheck size={45} />
          </div>

          <p className="eyebrow">ZERO TRUST SECURITY</p>

          <h1>
            Trust Nothing.
            <br />
            <span>Verify Everything.</span>
          </h1>

          <p className="description">
            Secure your digital environment with intelligent
            authentication and continuous access verification.
          </p>

          <div className="features">
            <span>✓ Identity Verification</span>
            <span>✓ Device Trust</span>
            <span>✓ Risk Assessment</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="tabs">
            <button
              className={isLogin ? "active" : ""}
              onClick={() => {
                setIsLogin(true);
                setMessage("");
              }}
            >
              Sign In
            </button>

            <button
              className={!isLogin ? "active" : ""}
              onClick={() => {
                setIsLogin(false);
                setMessage("");
              }}
            >
              Create Account
            </button>
          </div>

          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>

          <p className="subheading">
            {isLogin
              ? "Enter your credentials to access your account."
              : "Register for the Zero Trust platform."}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <label>
                Username
                <div className="input-box">
                  <User size={18} />
                  <input
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </label>
            )}

            <label>
              Email Address
              <div className="input-box">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-box">
                <Lock size={18} />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </label>

            <button
              className="submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
              <ArrowRight size={19} />
            </button>
          </form>

          {message && <p className="message">{message}</p>}

          <div className="card-footer">
            <ShieldCheck size={17} />
            Protected by Zero Trust Security
          </div>
        </section>
      </main>

      <footer>
        © 2026 ZeroTrust-ZTNA · Secure Access Management
      </footer>
    </div>
  );
}

export default App;
