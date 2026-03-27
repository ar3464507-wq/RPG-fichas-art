import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Cog,
  LayoutDashboard,
  LogOut,
  Scroll,
  Swords,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRpgTheme } from "../contexts/RpgThemeContext";
import { trpc } from "../lib/trpc";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/campaigns", label: "Campanhas", icon: BookOpen },
  { path: "/settings", label: "Configurações", icon: Cog },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useRpgTheme();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => (window.location.href = "/"),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <Swords className="w-10 h-10 animate-pulse" style={{ color: "var(--primary)" }} />
          <p style={{ color: "var(--muted-foreground)" }} className="text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center max-w-md mx-auto px-6">
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <Swords className="w-10 h-10" style={{ color: "var(--primary)" }} />
            </div>
          </div>
          <h1
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
          >
            RPG Sheet
          </h1>
          <p className="mb-8 text-base" style={{ color: "var(--muted-foreground)" }}>
            Crie, personalize e compartilhe fichas de RPG. Colabore em tempo real com seu grupo.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            <Scroll className="w-4 h-4" />
            Entrar na Aventura
          </a>
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "⚔️", label: "Fichas Personalizáveis" },
              { icon: "🏰", label: "Campanhas" },
              { icon: "🎲", label: "Tempo Real" },
            ].map((f) => (
              <div
                key={f.label}
                className="p-4 rounded-xl"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                  {f.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 shrink-0"
        style={{
          width: collapsed ? "64px" : "220px",
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--primary)" }}
          >
            <Swords className="w-4 h-4" style={{ color: "var(--primary-foreground)" }} />
          </div>
          {!collapsed && (
            <span
              className="font-bold text-sm tracking-wide truncate"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
            >
              RPG Sheet
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location === path;
            return (
              <Link key={path} href={path}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                  }}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{label}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + collapse */}
        <div
          className="px-2 py-3 space-y-1"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {!collapsed && user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>
                {user.name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                {user.email}
              </p>
            </div>
          )}
          <button
            onClick={() => logout.mutate()}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-all hover:opacity-80"
            style={{ color: "var(--muted-foreground)" }}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-all hover:opacity-80"
            style={{ color: "var(--muted-foreground)" }}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="text-sm">Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
