import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { LayoutDashboard, Store, BarChart3, ArrowLeft } from "lucide-react";
import logoBranca from "@/assets/modoGESTOR_branca.png";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/tenants", icon: Store, label: "Barbearias" },
  { to: "/admin/tracking", icon: BarChart3, label: "Tracking" },
];

export default function AdminLayout() {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,5%)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,5%)] flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800/50 flex flex-col p-4 gap-1 shrink-0">
        <div className="flex items-center gap-2 mb-1 px-2">
          <img src={logoBranca} alt="modoGESTOR" className="h-5" />
          <span className="text-[10px] font-semibold tracking-widest uppercase text-[hsl(44,65%,54%)]">Admin</span>
        </div>

        <nav className="flex flex-col gap-0.5 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-[hsl(44,65%,54%)]/10 text-[hsl(44,65%,54%)] font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => navigate("/app/dashboard")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors w-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao app
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
