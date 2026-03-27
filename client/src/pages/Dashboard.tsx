import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  ExternalLink,
  MoreVertical,
  Plus,
  Share2,
  Swords,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import ShareModal from "../components/ShareModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [shareCharUid, setShareCharUid] = useState<string | null>(null);

  const { data: characters, isLoading } = trpc.character.list.useQuery();

  const createMutation = trpc.character.create.useMutation({
    onSuccess: (data) => {
      utils.character.list.invalidate();
      navigate(`/character/${data.uid}`);
    },
    onError: () => toast.error("Erro ao criar personagem"),
  });

  const deleteMutation = trpc.character.delete.useMutation({
    onSuccess: () => {
      utils.character.list.invalidate();
      toast.success("Personagem deletado");
    },
    onError: () => toast.error("Erro ao deletar personagem"),
  });

  const duplicateMutation = trpc.character.duplicate.useMutation({
    onSuccess: (data) => {
      utils.character.list.invalidate();
      toast.success("Personagem duplicado");
      navigate(`/character/${data.uid}`);
    },
    onError: () => toast.error("Erro ao duplicar personagem"),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
          >
            Meus Personagens
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {characters?.length ?? 0} personagem{(characters?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate({})}
          disabled={createMutation.isPending}
          className="flex items-center gap-2"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          <Plus className="w-4 h-4" />
          {createMutation.isPending ? "Criando..." : "Novo Personagem"}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                height: "280px",
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!characters || characters.length === 0) && (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "2px dashed var(--border)" }}
        >
          <Swords className="w-16 h-16 mb-4 opacity-30" style={{ color: "var(--primary)" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Nenhum personagem ainda
          </h3>
          <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
            Crie seu primeiro personagem para começar a aventura
          </p>
          <Button
            onClick={() => createMutation.mutate({})}
            disabled={createMutation.isPending}
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Personagem
          </Button>
        </div>
      )}

      {/* Characters grid */}
      {!isLoading && characters && characters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {characters.map((char) => (
            <div
              key={char.uid}
              className="rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 animate-fade-in"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 12px oklch(0 0 0 / 0.3)",
              }}
              onClick={() => navigate(`/character/${char.uid}`)}
            >
              {/* Character image */}
              <div
                className="relative h-44 overflow-hidden"
                style={{ background: "var(--secondary)" }}
              >
                {char.imageUrl ? (
                  <img
                    src={char.imageUrl}
                    alt={char.name ?? ""}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 opacity-20" style={{ color: "var(--foreground)" }} />
                  </div>
                )}
                {/* Theme badge */}
                {char.theme && char.theme !== "classic" && (
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    {char.theme === "medieval"
                      ? "Medieval"
                      : char.theme === "terror"
                      ? "Terror"
                      : "Investigação"}
                  </div>
                )}
                {/* Actions menu */}
                <div
                  className="absolute top-2 right-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "oklch(0 0 0 / 0.6)" }}
                      >
                        <MoreVertical className="w-4 h-4 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/character/${char.uid}`)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir ficha
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareCharUid(char.uid)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => duplicateMutation.mutate({ uid: char.uid })}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400"
                        onClick={() => {
                          if (confirm(`Deletar "${char.name}"?`)) {
                            deleteMutation.mutate({ uid: char.uid });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3
                  className="font-semibold text-sm truncate mb-1"
                  style={{ color: "var(--foreground)" }}
                >
                  {char.name || "Sem nome"}
                </h3>
                {char.playerName && (
                  <p className="text-xs truncate mb-1" style={{ color: "var(--muted-foreground)" }}>
                    Jogador: {char.playerName}
                  </p>
                )}
                {char.rpgSystem && (
                  <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    Sistema: {char.rpgSystem}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/character/${char.uid}`);
                    }}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    Abrir
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareCharUid(char.uid);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      background: "var(--secondary)",
                      color: "var(--secondary-foreground)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {shareCharUid && (
        <ShareModal
          characterUid={shareCharUid}
          onClose={() => setShareCharUid(null)}
        />
      )}
    </div>
  );
}
