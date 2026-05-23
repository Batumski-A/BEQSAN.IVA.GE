import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { clearAdminToken, getAdminToken, setOnUnauthorized } from './api';

/**
 * Guards admin routes. If the user has no token in localStorage, redirect to
 * /adminpanel/login with the original target preserved in location.state so
 * the login form can bounce back after success.
 *
 * Also registers a global 401 handler so that an expired/revoked token
 * automatically kicks the user back to the login screen.
 */
export const AdminGate = ({ children }: { children: ReactNode }): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getAdminToken();

  useEffect(() => {
    setOnUnauthorized(() => {
      clearAdminToken();
      navigate('/adminpanel/login', { replace: true, state: { from: location } });
    });
    return () => setOnUnauthorized(null);
  }, [navigate, location]);

  if (!token) {
    return <Navigate to="/adminpanel/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
