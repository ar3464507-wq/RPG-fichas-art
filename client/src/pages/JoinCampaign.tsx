import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { BookOpen, LogIn } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

export default function JoinCampaign() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const joinMutation = trpc.campaign.join.useMutation({
    onSuccess: (data) => {
      toast.success("Você entrou na campanha!");
      navigate(`/campaign/${data.uid}`);
    },
    onError: (err) => {
      toast.error("Erro ao entrar na campanha: " + err.message);
      navigate("/campaigns");
    },
  });

  useEffect(() => {
    if (!loading && isAuthenticated && token) {
      joinMutation.mutate({ inviteToken: token });
    }
  }, [loading, isAuthenticated, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div
          className="text-center p-8 rounded-2xl max-w-sm"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--primary)" }} />
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}>
            Convite de Campanha
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            Faça login para entrar na campanha
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <LogIn className="w-4 h-4" />
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--primary)" }} />
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Entrando na campanha...</p>
      </div>
    </div>
  );
}
