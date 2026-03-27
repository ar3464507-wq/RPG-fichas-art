import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, Palette, User } from "lucide-react";
import { toast } from "sonner";
import { RPG_THEMES, useRpgTheme } from "../contexts/RpgThemeContext";
import { trpc } from "../lib/trpc";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useRpgTheme();
  const utils = trpc.useUtils();

  const updatePrefs = trpc.user.updatePreferences.useMutation({
    onSuccess: () => toast.success("Preferências salvas"),
    onError: () => toast.error("Erro ao salvar preferências"),
  });

  const handleThemeChange = (t: typeof theme) => {
    setTheme(t);
    updatePrefs.mutate({ globalTheme: t });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
      >
        Configurações
      </h1>

      {/* Account section */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
            Conta
          </h2>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                {user?.name ?? "Usuário"}
              </p>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {user?.email ?? ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Theme section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
            Tema Visual
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {RPG_THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className="p-4 rounded-xl text-left transition-all hover:opacity-90"
              style={{
                background: "var(--card)",
                border: `2px solid ${theme === t.value ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ background: t.color }}
                />
                {theme === t.value && (
                  <Check className="w-4 h-4" style={{ color: "var(--primary)" }} />
                )}
              </div>
              <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                {t.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
