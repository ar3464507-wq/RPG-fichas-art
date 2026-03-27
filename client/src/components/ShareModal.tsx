import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, Link2, Shield, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

interface ShareModalProps {
  characterUid: string;
  onClose: () => void;
}

export default function ShareModal({ characterUid, onClose }: ShareModalProps) {
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createShare = trpc.share.create.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/character/${characterUid}?share=${data.shareToken}`;
      setGeneratedLink(url);
    },
    onError: () => toast.error("Erro ao gerar link"),
  });

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 animate-fade-in"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 48px oklch(0 0 0 / 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
              Compartilhar Ficha
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: "var(--secondary)" }}
          >
            <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        {/* Permission selector */}
        <div className="mb-5">
          <p className="text-sm font-medium mb-3" style={{ color: "var(--foreground)" }}>
            Permissão de acesso
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["view", "edit"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className="flex items-center gap-2 p-3 rounded-lg transition-all text-left"
                style={{
                  background: permission === p ? "var(--accent)" : "var(--secondary)",
                  border: `1px solid ${permission === p ? "var(--primary)" : "var(--border)"}`,
                  color: permission === p ? "var(--primary)" : "var(--muted-foreground)",
                }}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">
                    {p === "view" ? "Visualização" : "Edição"}
                  </p>
                  <p className="text-xs opacity-70">
                    {p === "view" ? "Apenas leitura" : "Pode editar"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        {!generatedLink && (
          <Button
            onClick={() => createShare.mutate({ characterUid, permission })}
            disabled={createShare.isPending}
            className="w-full"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Link2 className="w-4 h-4 mr-2" />
            {createShare.isPending ? "Gerando..." : "Gerar Link"}
          </Button>
        )}

        {/* Generated link */}
        {generatedLink && (
          <div className="space-y-3">
            <div
              className="p-3 rounded-lg text-xs break-all"
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              {generatedLink}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copiado!" : "Copiar Link"}
              </Button>
              <Button
                onClick={() => window.open(generatedLink, "_blank")}
                variant="outline"
                className="px-3"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <button
              onClick={() => {
                setGeneratedLink(null);
                setPermission("view");
              }}
              className="w-full text-xs py-2 transition-all hover:opacity-70"
              style={{ color: "var(--muted-foreground)" }}
            >
              Gerar novo link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
