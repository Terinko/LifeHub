import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";

/** Layout route: renders the matched child route only for signed-in users. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
