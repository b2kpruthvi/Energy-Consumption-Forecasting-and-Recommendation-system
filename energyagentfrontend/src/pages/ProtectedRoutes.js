import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const useAuth = () => {
  // Check if the token exists in localStorage
  const token = localStorage.getItem('access_token');
  return token ? true : false;
};

const ProtectedRoutes = () => {
  const isAuth = useAuth();
  
  // If authorized, render the child routes (Outlet).
  // If not, redirect to the login page.
  return isAuth ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoutes;