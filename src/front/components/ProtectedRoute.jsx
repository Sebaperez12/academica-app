import { Navigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { store } = useGlobalReducer();
  const token = localStorage.getItem("token");
  const role = store.role || localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};