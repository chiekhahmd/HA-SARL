/**
 * Login Page — handles sign-in + forced password change.
 */
import { useState, FormEvent } from 'react';
import { signIn, confirmSignIn } from 'aws-amplify/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (needsNewPassword) {
        // Complete the NEW_PASSWORD_REQUIRED challenge
        const result = await confirmSignIn({ challengeResponse: newPassword });
        if (result.isSignedIn) {
          // Reload to trigger auth check
          window.location.reload();
        } else {
          setError('Password change failed. Try again.');
        }
      } else {
        // Initial sign-in
        const result = await signIn({ username: email, password });

        if (result.isSignedIn) {
          window.location.reload();
        } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          setNeedsNewPassword(true);
        } else {
          setError(`Unexpected sign-in step: ${result.nextStep?.signInStep}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '2rem',
          borderRadius: 8,
          width: '100%',
          maxWidth: 360,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Society ERP
        </h1>

        {needsNewPassword && (
          <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem', textAlign: 'center' }}>
            Please set a new password
          </p>
        )}

        {error && (
          <div
            style={{
              background: '#fee',
              color: '#c00',
              padding: '0.5rem',
              borderRadius: 4,
              marginBottom: '1rem',
              fontSize: '0.85rem',
              wordBreak: 'break-word',
            }}
          >
            {error}
          </div>
        )}

        {!needsNewPassword && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    paddingRight: '2.5rem',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </>
        )}

        {needsNewPassword && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="newPassword" style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 chars, uppercase, lowercase, digit"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  paddingRight: '2.5rem',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
              Must contain uppercase, lowercase, and a number
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#1a73e8',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: '1rem',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Please wait...' : needsNewPassword ? 'Set Password' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
