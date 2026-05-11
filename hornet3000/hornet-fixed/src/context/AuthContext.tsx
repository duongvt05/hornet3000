import { createContext, useContext, useState, useEffect } from "react";

interface User {
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials (thay bằng API thật)
const DEMO_USERS: Record<string, { password: string; name: string; role: "admin" | "operator" | "viewer" }> = {
  "admin@smart-hive.com": { password: "admin123", name: "Admin User", role: "admin" },
  "operator@smart-hive.com": { password: "op123", name: "Operator", role: "operator" },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục session từ localStorage khi load
  useEffect(() => {
    const savedUser = localStorage.getItem("hornet_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("hornet_user");
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Giả lập API call delay
    await new Promise((r) => setTimeout(r, 800));

    const found = DEMO_USERS[email.toLowerCase()];
    if (!found) return { success: false, error: "Email không tồn tại." };
    if (found.password !== password) return { success: false, error: "Mật khẩu không đúng." };

    const newUser: User = { email: email.toLowerCase(), name: found.name, role: found.role };
    setUser(newUser);
    localStorage.setItem("hornet_user", JSON.stringify(newUser));
    return { success: true };
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("hornet_user");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
