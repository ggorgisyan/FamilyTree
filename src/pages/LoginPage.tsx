import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, authError } = useAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-4">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🌳</div>
        <h1 className="text-4xl font-bold text-amber-900 mb-2">Gorguissian Family Tree</h1>
        <p className="text-amber-700 text-lg">Sign in to explore your family history</p>
      </div>
      <button
        onClick={signIn}
        className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium shadow hover:shadow-md hover:bg-gray-50 transition"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="w-5 h-5"
        />
        Sign in with Google
      </button>

      {authError && (
        <div className="mt-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-semibold mb-1">Sign-in error</div>
          <div>{authError}</div>
        </div>
      )}

      <div className="mt-4 max-w-2xl rounded-lg border border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-900">
        If Google sign-in does not open, check Firebase Authentication and make sure <strong>Google</strong> is enabled and <strong>localhost</strong> is added to Authorized domains.
      </div>
    </div>
  )
}
