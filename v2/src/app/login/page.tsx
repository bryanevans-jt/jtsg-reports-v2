'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

function LoginContent() {
  const [logoSrc, setLogoSrc] = useState('/logo.svg');
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setUrlError(params.get('error'));
    }
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (signInError) {
        setAuthError(signInError.message);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setAuthError('Sign-in could not be started. Please check that Google Auth is enabled in Supabase.');
      }
    } catch (e) {
      setAuthError((e as Error).message || 'An unexpected error occurred');
    } finally {
      setSigningIn(false);
    }
  };

  const currentYear = new Date().getFullYear();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <div className="flex justify-center mb-4 min-h-[80px] items-center">
            <img
              src={logoSrc}
              alt="Joshua Tree Service Group"
              className="max-h-24 w-auto object-contain"
              style={{ maxWidth: '240px' }}
              onError={() => setLogoSrc((prev) => (prev === '/logo.svg' ? '/logo.png' : prev))}
            />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-green-800">Report Submission</h1>
          <p className="text-gray-600 mb-6">
            Sign in with your organizational Google account to get started.
          </p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full py-3 px-4 bg-green-700 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? 'Redirecting...' : 'Sign In with Google'}
          </button>
          {authError && (
            <p className="text-red-600 text-sm mt-4">{authError}</p>
          )}
          {urlError === 'org_only' && (
            <p className="text-red-600 text-sm mt-4">
              Only @thejoshuatree.org accounts can access this application.
            </p>
          )}
          {urlError === 'auth_failed' && (
            <p className="text-red-600 text-sm mt-4">Sign-in failed. Please try again.</p>
          )}
        </div>
      </div>
      <footer className="py-4 text-center text-sm text-gray-500">
        © {currentYear} Joshua Tree Service Group · Version 2.0.4
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return <LoginContent />;
}
