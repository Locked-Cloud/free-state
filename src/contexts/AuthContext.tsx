import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// Define the authentication context type
interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  userRole: string | null;
  lastActivity: number;
  login: (username: string, role?: string) => void;
  logout: () => void;
  updateLastActivity: () => void;
  isSessionExpired: () => boolean;
}

// Create the context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Constants for storage keys to avoid typos
const STORAGE_KEYS = {
  IS_AUTHENTICATED: "isAuthenticated",
  USERNAME: "username",
  USER_ROLE: "userRole",
  AUTH_TOKEN: "authToken",
  LAST_ACTIVITY: "lastActivity",
};

// Session duration in milliseconds (30 minutes)
const SESSION_DURATION = 30 * 60 * 1000;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Logout function
  const logout = useCallback(() => {
    // Clear auth data from localStorage
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);

    // Clear OTP verification
    sessionStorage.removeItem("otpVerified");

    // Reset state
    setIsAuthenticated(false);
    setUsername(null);
    setUserRole(null);
  }, []);

  // Check if the session is expired
  const isSessionExpired = useCallback(() => {
    const lastActivityTime = Number(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY)) || 0;
    return Date.now() - lastActivityTime > SESSION_DURATION;
  }, []);

  // Update the last activity timestamp
  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
  }, []);

  // Initialize auth state from storage
  useEffect(() => {
    const authStatus = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
    const storedUsername = localStorage.getItem(STORAGE_KEYS.USERNAME);
    const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    const storedLastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);

    if (authStatus === "true" && storedUsername) {
      if (isSessionExpired()) {
        logout();
      } else {
        setIsAuthenticated(true);
        setUsername(storedUsername);
        setUserRole(storedRole);
        if (storedLastActivity) {
          setLastActivity(Number(storedLastActivity));
        }
      }
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleUserActivity = () => {
      if (isAuthenticated) {
        updateLastActivity();
      }
    };

    events.forEach(event => window.addEventListener(event, handleUserActivity));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [isAuthenticated, isSessionExpired, updateLastActivity, logout]); // ✅ Fixed: added `logout`

  // Login function
  const login = useCallback((username: string, role: string = "user") => {
    const now = Date.now();

    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());

    setIsAuthenticated(true);
    setUsername(username);
    setUserRole(role);
    setLastActivity(now);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        userRole,
        lastActivity,
        login,
        logout,
        updateLastActivity,
        isSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
