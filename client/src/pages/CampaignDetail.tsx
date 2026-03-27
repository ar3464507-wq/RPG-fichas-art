import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Check, Copy, Plus, Share2, User, X } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";

export default function CampaignDetail() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [showAddCharacter, setShowAddCharacter] = useState(false);

  const { data, isLoading, refetch } = trpc.campaign.get.useQuery({ uid: uid! }, { enabled: !!uid });

  const campaign = data?.campaign;
  const characters = data?.characters ?? [];
  const isOwner = user && campaign && user.id === campaign.ownerId;

  // Get user's characters that are not in this campaign
  const { data: userCharacters } = trpc.character.list.useQuery();
  const availableCharacters = (userCharacters ?? []).filter(
    (char) => !characters.some((c) => c.id === char.id)
  );

  const updateCharacter = trpc.character.update.useMutation({
    onSuccess: () => {
      toast.success("Personagem adicionado à campanha!");
      setShowAddCharacter(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar personagem: " + error.message);
    },
  });

  const handleAddCharacter = (charUid: string) => {
    if (!campaign) return;
    updateCharacter.mutate({
      uid: charUid,
      campaignId: campaign.id,
    });
  };

  const handleRemoveCharacter = (charUid: string) => {
    updateCharacter.mutate({
      uid: charUid,
      campaignId: null,
    });
  };

  const handleCopyInvite = () => {
    if (!campaign?.inviteToken) return;
    const link = `${window.location.origin}/join/${campaign.inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link de convite copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--foreground)" }}>Campanha não encontrada</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/campaigns")}
        className="flex items-center gap-1.5 text-sm mb-6 hover:opacity-70 transition-opacity"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Campanhas
      </button>

      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        {campaign.imageUrl && (
          <div className="h-48 overflow-hidden">
            <img src={campaign.imageUrl} alt={campaign.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
              >
                {campaign.name}
              </h1>
              {campaign.description && (
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {campaign.description}
                </p>
              )}
            </div>
            <Button
              onClick={handleCopyInvite}
              className="shrink-0"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
              {copied ? "Copiado!" : "Convidar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Add Character Section */}
      {availableCharacters.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Adicionar Personagens
            </h3>
            <button
              onClick={() => setShowAddCharacter(!showAddCharacter)}
              className="text-xs flex items-center gap-1 hover:opacity-70"
              style={{ color: "var(--primary)" }}
            >
              <Plus className="w-3 h-3" /> {showAddCharacter ? "Cancelar" : "Adicionar"}
            </button>
          </div>
          {showAddCharacter && (
            <div className="space-y-2">
              {availableCharacters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "var(--background)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {char.name || "Sem nome"}
                    </p>
                    {char.rpgSystem && (
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {char.rpgSystem}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddCharacter(char.uid)}
                    disabled={updateCharacter.isPending}
                    className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-70 disabled:opacity-50"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                  >
                    {updateCharacter.isPending ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Characters */}
      <div>
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "var(--primary)" }}
        >
          Personagens ({characters.length})
        </h2>
        {characters.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl"
            style={{ border: "2px dashed var(--border)" }}
          >
            <BookOpen className="w-12 h-12 mb-3 opacity-20" style={{ color: "var(--foreground)" }} />
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Nenhum personagem nesta campanha ainda.
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
              {isOwner ? "Use o botão acima para adicionar seus personagens." : "Clique no botão 'Adicionar' acima para adicionar seus personagens à campanha."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <div
                key={char.uid}
                className="rounded-xl overflow-hidden group transition-all"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="h-32 relative overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/character/${char.uid}`)}
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
                      <User className="w-10 h-10 opacity-20" style={{ color: "var(--foreground)" }} />
                    </div>
                  )}
                </div>
                <div className="p-3 cursor-pointer" onClick={() => navigate(`/character/${char.uid}`)}>
                  <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                    {char.name || "Sem nome"}
                  </p>
                  {char.playerName && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {char.playerName}
                    </p>
                  )}
                </div>
                {isOwner && (
                  <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <button
                      onClick={() => {
                        if (confirm("Remover este personagem da campanha?")) {
                          handleRemoveCharacter(char.uid);
                        }
                      }}
                      className="text-xs w-full py-1 rounded transition-opacity hover:opacity-70 flex items-center justify-center gap-1"
                      style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
                    >
                      <X className="w-3 h-3" /> Remover
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
