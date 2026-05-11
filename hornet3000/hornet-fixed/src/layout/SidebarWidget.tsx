import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function SidebarWidget() {
  const { user } = useAuth();

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
        {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"}
      </div>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white text-sm">
        {user?.name ?? "Guest"}
      </h3>
      <p className="text-gray-500 text-xs dark:text-gray-400 mb-3">{user?.email ?? ""}</p>
      {user?.role && (
        <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-4 ${
          user.role === "admin"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : user.role === "operator"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        }`}>
          {user.role.toUpperCase()}
        </span>
      )}
      <Link
        to="/settings"
        className="flex items-center justify-center p-2.5 font-medium text-white rounded-lg bg-brand-500 text-xs hover:bg-brand-600 transition-colors"
      >
        System Settings
      </Link>
    </div>
  );
}
