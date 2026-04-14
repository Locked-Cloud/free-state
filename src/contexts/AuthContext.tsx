import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { secureSet, secureGet, secureRemove } from "../utils/encryptedStorage";

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
  const [initialized, setInitialized] = useState(false);

  // Check if the session is expired (uses plain localStorage for timestamp — speed matters)
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

  // Logout function — declared before useEffect that depends on it
  const logout = useCallback(() => {
    // Clear encrypted auth data
    secureRemove(STORAGE_KEYS.IS_AUTHENTICATED);
    secureRemove(STORAGE_KEYS.USERNAME);
    secureRemove(STORAGE_KEYS.USER_ROLE);
    secureRemove(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    
    // Clear OTP verification
    sessionStorage.removeItem("otpVerified");
    
    // Reset state
    setIsAuthenticated(false);
    setUsername(null);
    setUserRole(null);
  }, []);

  // Initialize auth state from encrypted storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authStatus = await secureGet(STORAGE_KEYS.IS_AUTHENTICATED);
        const storedUsername = await secureGet(STORAGE_KEYS.USERNAME);
        const storedRole = await secureGet(STORAGE_KEYS.USER_ROLE);
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
      } catch {
        // If decryption fails, data was tampered — force logout
        logout();
      } finally {
        setInitialized(true);
      }
    };

    initAuth();
  }, [isSessionExpired, logout]);

  // Set up activity tracking (only after initialization)
  useEffect(() => {
    if (!initialized) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      if (isAuthenticated) {
        updateLastActivity();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [initialized, isAuthenticated, updateLastActivity]);

  // Login function — stores encrypted auth data
  const login = useCallback((username: string, role: string = "user") => {
    const now = Date.now();
    
    // Store encrypted auth data
    secureSet(STORAGE_KEYS.IS_AUTHENTICATED, "true");
    secureSet(STORAGE_KEYS.USERNAME, username);
    secureSet(STORAGE_KEYS.USER_ROLE, role);
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    
    // Update state
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
        isSessionExpired
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
