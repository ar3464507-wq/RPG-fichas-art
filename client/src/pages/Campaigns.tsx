import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Share2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

export default function Campaigns() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);

  const { data: campaigns, isLoading } = trpc.campaign.list.useQuery();

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: (data) => {
      utils.campaign.list.invalidate();
      setCreating(false);
      setNewName("");
      setNewDesc("");
      navigate(`/campaign/${data.uid}`);
    },
    onError: () => toast.error("Erro ao criar campanha"),
  });

  const deleteMutation = trpc.campaign.delete.useMutation({
    onSuccess: () => {
      utils.campaign.list.invalidate();
      toast.success("Campanha deletada");
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
          >
            Campanhas
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {campaigns?.length ?? 0} campanha{(campaigns?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <div
          className="mb-6 p-5 rounded-2xl animate-fade-in"
          style={{ background: "var(--card)", border: "1px solid var(--primary)" }}
        >
          <h3 className="font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Nova Campanha
          </h3>
          <div className="space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da campanha"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              autoFocus
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate({ name: newName, description: newDesc })}
                disabled={!newName.trim() || createMutation.isPending}
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse h-40"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!campaigns || campaigns.length === 0) && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "2px dashed var(--border)" }}
        >
          <BookOpen className="w-16 h-16 mb-4 opacity-30" style={{ color: "var(--primary)" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Nenhuma campanha ainda
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            Crie uma campanha para organizar seus personagens
          </p>
          <Button
            onClick={() => setCreating(true)}
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Campanha
          </Button>
        </div>
      )}

      {/* Campaigns grid */}
      {!isLoading && campaigns && campaigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((camp) => (
            <div
              key={camp.uid}
              className="rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 animate-fade-in"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 12px oklch(0 0 0 / 0.3)",
              }}
              onClick={() => navigate(`/campaign/${camp.uid}`)}
            >
              {/* Image */}
              <div
                className="h-32 relative overflow-hidden"
                style={{ background: "var(--secondary)" }}
              >
                {camp.imageUrl ? (
                  <img
                    src={camp.imageUrl}
                    alt={camp.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-10 h-10 opacity-20" style={{ color: "var(--foreground)" }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                  {camp.name}
                </h3>
                {camp.description && (
                  <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--muted-foreground)" }}>
                    {camp.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/campaign/${camp.uid}`);
                    }}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    Abrir
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const link = `${window.location.origin}/join/${camp.inviteToken}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Link de convite copiado!");
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      background: "var(--secondary)",
                      color: "var(--secondary-foreground)",
                      border: "1px solid var(--border)",
                    }}
                    title="Copiar link de convite"
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                  {camp.ownerId === user?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Deletar "${camp.name}"?`)) {
                          deleteMutation.mutate({ uid: camp.uid });
                        }
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: "var(--secondary)",
                        color: "var(--muted-foreground)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
