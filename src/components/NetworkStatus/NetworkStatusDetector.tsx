import React, { useEffect } from 'react';
import { useNetwork } from '../../contexts/NetworkContext';
import { useLocation, useNavigate } from 'react-router-dom';

const NetworkStatusDetector: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline } = useNetwork();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're not already on the network-lost page
    if (!isOnline && location.pathname !== '/network-lost') {
      // Store the current location to return to when back online
      sessionStorage.setItem('lastPath', location.pathname);
      navigate('/network-lost');
    } else if (isOnline && location.pathname === '/network-lost') {
      // If we're back online and on the network-lost page, go back to the previous page
      const lastPath = sessionStorage.getItem('lastPath') || '/';
      navigate(lastPath);
    }
  }, [isOnline, navigate, location.pathname]);

  return <>{children}</>;
};

export default NetworkStatusDetector;