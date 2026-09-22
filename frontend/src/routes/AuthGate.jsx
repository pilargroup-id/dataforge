import { useEffect, useState } from 'react';

import { getCurrentUser } from '../services/auth.service.js';

const DEFAULT_LOGIN_URL = 'https://pilargroup.id/login';

function redirectToLogin() {
  const loginUrl = import.meta.env.VITE_PILARGROUP_LOGIN_URL || DEFAULT_LOGIN_URL;
  const returnUrl = encodeURIComponent(window.location.href);

  window.location.href = `${loginUrl}?return_url=${returnUrl}`;
}

// Gate render dashboard sampai auth check selesai, supaya dashboard
// tidak sempat flicker sebelum redirect ke login pusat pilargroup.
export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then(() => {
        if (isMounted) setStatus('authenticated');
      })
      .catch((err) => {
        if (!isMounted) return;

        // Hanya redirect kalau backend eksplisit bilang 401.
        // Error lain (network, 5xx, dsb) dianggap bukan unauthenticated,
        // karena backend bisa saja punya fallback auth sendiri (dev auto-login, dll).
        if (err?.status === 401) {
          setStatus('redirecting');
          redirectToLogin();
          return;
        }

        setStatus('authenticated');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (status !== 'authenticated') {
    return null;
  }

  return children;
}
