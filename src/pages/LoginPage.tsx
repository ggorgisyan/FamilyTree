import { useAuth } from '../contexts/AuthContext'
import LoginLogo from '../components/LoginLogo'

export default function LoginPage() {
  const { signIn, authError } = useAuth()

  return (
    <div className="login-stage">
      <div className="login-card">
        <div className="crest">
          <LoginLogo />
        </div>
        <h1>The Gorguissian Family</h1>
        <p>Seven generations, one living record. Sign in to explore, remember, and add to your family&rsquo;s story.</p>

        <button className="gbtn" onClick={signIn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            width={18}
            height={18}
          />
          Continue with Google
        </button>

        {authError && (
          <div className="login-note err">{authError}</div>
        )}

        <div className="login-note info">
          If Google sign-in does not open, check that the Google provider is enabled in Firebase and that this domain is in the authorized domains list.
        </div>

        <div className="login-foot">Invitation-based &middot; new visitors join as viewers</div>
      </div>
    </div>
  )
}
