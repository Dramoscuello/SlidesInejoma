import React from 'react';
import { Navigate } from 'react-router-dom';
import { isSessionValid } from '../utils/auth';

export default function ProtectedRoute({ children }) {
  if (!isSessionValid()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
