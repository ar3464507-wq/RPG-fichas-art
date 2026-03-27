import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Camera,
  Edit2,
  Eye,
  Image,
  Lock,
  LockOpen,
  Minus,
  Plus,
  Save,
  Share2,
  Trash2,
  Users,
  X,
  Check,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import ShareModal from "../components/ShareModal";
import { RPG_THEMES, type RpgTheme } from "../contexts/RpgThemeContext";
import { io, Socket } from "socket.io-client";

// ─── Types ────────────────────────────────────────────────────────────────────
type BasicInfoField = { label: string; value: string };

// ─── Inline editable field ───────────────────────────────────────────────────
function InlineEdit({
  value,
  onSave,
  placeholder,
  className,
  style,
  multiline,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    const props = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      },
      className: `bg-transparent outline-none border-b w-full ${className ?? ""}`,
      style: { borderColor: "var(--primary)", ...style },
      placeholder,
    };
    return multiline ? (
      <textarea {...props} rows={4} className={`${props.className} resize-none`} />
    ) : (
      <input {...props} />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:opacity-80 transition-opacity ${className ?? ""}`}
      style={style}
      title="Clique para editar"
    >
      {value || <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>{placeholder}</span>}
    </span>
  );
}

// ─── Resource bar ─────────────────────────────────────────────────────────────
function ResourceBar({
  resource,
  canEdit,
  onUpdate,
  onDelete,
}: {
  resource: { id: number; label: string; current: number; max: number; color: string };
  canEdit: boolean;
  onUpdate: (data: Partial<typeof resource>) => void;
  onDelete: () => void;
}) {
  const pct = Math.min(100, Math.max(0, (resource.current / Math.max(1, resource.max)) * 100));

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <InlineEdit
          value={resource.label}
          onSave={(v) => onUpdate({ label: v })}
          className="text-xs font-medium"
          style={{ color: "var(--foreground)" }}
        />
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={() => onUpdate({ current: Math.max(0, resource.current - 1) })}
                className="w-5 h-5 rounded flex items-center justify-center hover:opacity-70"
                style={{ background: "var(--secondary)" }}
              >
                <Minus className="w-3 h-3" style={{ color: "var(--foreground)" }} />
              </button>
            </>
          )}
          <span className="text-xs font-mono px-1" style={{ color: "var(--foreground)" }}>
            <InlineEdit
              value={String(resource.current)}
              onSave={(v) => onUpdate({ current: parseInt(v) || 0 })}
              className="w-8 text-center"
              style={{ color: "var(--foreground)" }}
            />
            /
            <InlineEdit
              value={String(resource.max)}
              onSave={(v) => onUpdate({ max: parseInt(v) || 1 })}
              className="w-8 text-center"
              style={{ color: "var(--foreground)" }}
            />
          </span>
          {canEdit && (
            <>
              <button
                onClick={() => onUpdate({ current: Math.min(resource.max, resource.current + 1) })}
                className="w-5 h-5 rounded flex items-center justify-center hover:opacity-70"
                style={{ background: "var(--secondary)" }}
              >
                <Plus className="w-3 h-3" style={{ color: "var(--foreground)" }} />
              </button>
              <button
                onClick={onDelete}
                className="w-5 h-5 rounded flex items-center justify-center hover:opacity-70 ml-1"
                style={{ background: "var(--secondary)" }}
              >
                <Trash2 className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
              </button>
            </>
          )}
        </div>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--secondary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: resource.color }}
        />
      </div>
    </div>
  );
}

// ─── Main CharacterSheet ──────────────────────────────────────────────────────
export default function CharacterSheet() {
  const { uid } = useParams<{ uid: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const shareToken = new URLSearchParams(window.location.search).get("share") ?? undefined;
  const [showShare, setShowShare] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const socketRef = useRef<Socket | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [localTheme, setLocalTheme] = useState<RpgTheme>("classic");

  const { data, isLoading, refetch } = trpc.character.getWithData.useQuery(
    { uid: uid!, shareToken },
    { enabled: !!uid }
  );

  const char = data?.char;
  const canEdit = data?.canEdit ?? false;
  const isOwner = !!user && !!char && user.id === char.ownerId;

  // ─── Local state mirrors ────────────────────────────────────────────────────
  const [attributes, setAttributes] = useState(data?.attributes ?? []);
  const [resources, setResources] = useState(data?.resources ?? []);
  const [skills, setSkills] = useState(data?.skills ?? []);
  const [items, setItems] = useState(data?.items ?? []);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(data?.char?.wallpaperOpacity ?? 0.3);

  useEffect(() => {
    if (data) {
      setAttributes(data.attributes);
      setResources(data.resources);
      setSkills(data.skills);
      setItems(data.items);
      setLocalTheme((data.char?.theme as RpgTheme) ?? "classic");
    }
  }, [data]);

  // ─── Apply theme to page ────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", localTheme);
    return () => {
      if (prev) document.documentElement.setAttribute("data-theme", prev);
    };
  }, [localTheme]);

  // ─── Socket.io realtime ────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const socket = io({ path: "/api/socket.io" });
    socketRef.current = socket;
    socket.emit("join-character", uid);
    socket.on("online-count", (count: number) => setOnlineCount(count));
    socket.on("character-updated", () => {
      refetch();
    });
    return () => {
      socket.emit("leave-character", uid);
      socket.disconnect();
    };
  }, [uid]);

  // ─── Sync wallpaper opacity ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!char) return;
    setWallpaperOpacity(char.wallpaperOpacity ?? 0.3);
  }, [char?.wallpaperOpacity, char?.id]);;

  //  // ─── Mutations ──────────────────────────────────────────────────────────
  const updateChar = trpc.character.update.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const upsertAttr = trpc.attribute.upsert.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const deleteAttr = trpc.attribute.delete.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const upsertRes = trpc.resource.upsert.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const deleteRes = trpc.resource.delete.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const upsertSkill = trpc.skill.upsert.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const deleteSkill = trpc.skill.delete.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const upsertItem = trpc.item.upsert.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const deleteItem = trpc.item.delete.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });
  const uploadImage = trpc.character.uploadImage.useMutation({
    onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); },
  });

  // ─── Auto-save helper ───────────────────────────────────────────────────────
  const autoSave = useCallback(
    (fn: () => Promise<unknown>) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fn();
          socketRef.current?.emit("character-change", uid);
        } finally {
          setSaving(false);
        }
      }, 300);
    },
    [uid]
  );

  // ─── Field update helpers ───────────────────────────────────────────────────
  const updateField = (field: string, value: unknown) => {
    if (!canEdit || !char) return;
    autoSave(() =>
      updateChar.mutateAsync({ uid: char.uid, [field]: value })
    );
  };

  const handleAttrUpdate = (id: number, patch: { label?: string; value?: number }) => {
    if (!canEdit || !char) return;
    setAttributes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
    autoSave(() =>
      upsertAttr.mutateAsync({
        id,
        characterId: char.id,
        label: attributes.find((a) => a.id === id)!.label,
        value: attributes.find((a) => a.id === id)!.value ?? 0,
        ...patch,
        shareToken,
        ownerId: char.ownerId,
      })
    );
  };

  const handleAttrDelete = (id: number) => {
    if (!canEdit || !char) return;
    setAttributes((prev) => prev.filter((a) => a.id !== id));
    deleteAttr.mutate({ id, shareToken, ownerId: char.ownerId });
    socketRef.current?.emit("character-change", uid);
  };

  const addAttribute = () => {
    if (!canEdit || !char) return;
    const label = "Novo Atributo";
    const value = 0;
    upsertAttr.mutate(
      { characterId: char.id, label, value, sortOrder: attributes.length, shareToken, ownerId: char.ownerId },
      {
        onSuccess: () => {
          refetch();
          socketRef.current?.emit("character-change", uid);
        },
      }
    );
  };

  const handleResUpdate = (id: number, patch: Partial<(typeof resources)[0]>) => {
    if (!canEdit || !char) return;
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const res = resources.find((r) => r.id === id)!;
    const normalized = {
      id,
      characterId: char.id,
      label: res.label,
      current: res.current ?? 0,
      max: res.max ?? 10,
      color: res.color ?? '#6366f1',
      shareToken,
      ownerId: char.ownerId,
    };
    const merged = { ...normalized, ...patch } as typeof normalized;
    autoSave(() => upsertRes.mutateAsync(merged));
  };

  const handleResDelete = (id: number) => {
    if (!canEdit || !char) return;
    setResources((prev) => prev.filter((r) => r.id !== id));
    deleteRes.mutate({ id, shareToken, ownerId: char.ownerId });
    socketRef.current?.emit("character-change", uid);
  };

  const addResource = () => {
    if (!canEdit || !char) return;
    upsertRes.mutate(
      { characterId: char.id, label: "Novo Recurso", current: 10, max: 10, color: "#6366f1", sortOrder: resources.length, shareToken, ownerId: char.ownerId },
      {
        onSuccess: () => {
          refetch();
          socketRef.current?.emit("character-change", uid);
        },
      }
    );
  };

  const handleSkillUpdate = (id: number, patch: { category?: string; name?: string; value?: number; description?: string }) => {
    if (!canEdit || !char) return;
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const sk = skills.find((s) => s.id === id)!;
    autoSave(() =>
      upsertSkill.mutateAsync({ id, characterId: char.id, category: sk.category ?? "Geral", name: sk.name, value: sk.value ?? 0, description: sk.description ?? "", ...patch, shareToken, ownerId: char.ownerId })
    );
  };

  const addSkill = (category: string = "Geral") => {
    if (!canEdit || !char) return;
    upsertSkill.mutate(
      { characterId: char.id, category, name: "Nova Perícia", value: 0, description: "", sortOrder: skills.length, shareToken, ownerId: char.ownerId },
      { onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); } }
    );
  };

  const getSkillCategories = () => {
    const cats = new Set(skills.map((s) => s.category || "Geral"));
    return Array.from(cats).sort();
  };

  const handleItemUpdate = (id: number, patch: { name?: string; description?: string; quantity?: number }) => {
    if (!canEdit || !char) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const it = items.find((i) => i.id === id)!;
    autoSave(() =>
      upsertItem.mutateAsync({ id, characterId: char.id, name: it.name, description: it.description ?? "", quantity: it.quantity ?? 1, ...patch, shareToken, ownerId: char.ownerId })
    );
  };

  const addItem = () => {
    if (!canEdit || !char) return;
    upsertItem.mutate(
      { characterId: char.id, name: "Novo Item", description: "", quantity: 1, sortOrder: items.length, shareToken, ownerId: char.ownerId },
      { onSuccess: () => { refetch(); socketRef.current?.emit("character-change", uid); } }
    );
  };

  // ─── Image upload ───────────────────────────────────────────────────────────
  const handleImageUpload = (field: "imageUrl" | "wallpaperUrl") => {
    if (!canEdit || !char) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadImage.mutate({ uid: char.uid, base64, mimeType: file.type, field });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--primary)" }} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Carregando ficha...</p>
        </div>
      </div>
    );
  }

  if (!char) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>Ficha não encontrada</p>
          <button onClick={() => navigate("/")} className="text-sm" style={{ color: "var(--primary)" }}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const wallpaper = char.wallpaperUrl;
  // Convert stored opacity (0-1) to transparency percentage (0-100 where 100 = invisible)
  const transparencyPercent = Math.round((1 - wallpaperOpacity) * 100);
  const opacity = wallpaperOpacity;

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--background)" }}
      data-theme={localTheme}
    >
      {/* Wallpaper */}
      {wallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${wallpaper})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity,
          }}
        />
      )}

      <div className="relative z-10">
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{
            background: "oklch(from var(--background) l c h / 0.9)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
              style={{ color: "var(--muted-foreground)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <span style={{ color: "var(--border)" }}>|</span>
            <InlineEdit
              value={char.name ?? ""}
              onSave={(v) => updateField("name", v)}
              placeholder="Nome do personagem"
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)", fontFamily: "'Cinzel', serif" }}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Online indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
            >
              <Users className="w-3 h-3" />
              {onlineCount} {onlineCount === 1 ? "pessoa" : "pessoas"} vendo
            </div>

            {/* Saving indicator */}
            {saving && (
              <div className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <Save className="w-3 h-3 animate-pulse" />
                Salvando...
              </div>
            )}

            {/* Permission badge */}
            {!canEdit && (
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                <Eye className="w-3 h-3" />
                Visualização
              </div>
            )}

            {/* Theme selector */}
            {isOwner && (
              <select
                value={localTheme}
                onChange={(e) => {
                  const t = e.target.value as RpgTheme;
                  setLocalTheme(t);
                  updateField("theme", t);
                }}
                className="text-xs px-2 py-1 rounded-md"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                {RPG_THEMES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            )}

            {/* Privacy Toggle */}
            {isOwner && (
              <button
                onClick={() => {
                  const newPrivacy = !char.isPrivate;
                  updateChar.mutate({ uid: char.uid, isPrivate: newPrivacy });
                  toast.success(newPrivacy ? "Ficha marcada como privada" : "Ficha marcada como pública");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: char.isPrivate ? "var(--destructive)" : "var(--secondary)", color: char.isPrivate ? "var(--destructive-foreground)" : "var(--secondary-foreground)" }}
                title={char.isPrivate ? "Ficha privada - apenas você e o criador da campanha veem" : "Ficha pública - todos na campanha veem"}
              >
                {char.isPrivate ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                {char.isPrivate ? "Privada" : "Pública"}
              </button>
            )}

            {/* Share */}
            {isOwner && (
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                <Share2 className="w-3 h-3" />
                Compartilhar
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              {/* Character image */}
              <div
                className="rounded-2xl overflow-hidden relative group"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="h-56 relative">
                  {char.imageUrl ? (
                    <img src={char.imageUrl} alt={char.name ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                      <Camera className="w-12 h-12 opacity-20" style={{ color: "var(--foreground)" }} />
                    </div>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleImageUpload("imageUrl")}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "oklch(0 0 0 / 0.5)" }}
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <InlineEdit
                    value={char.name ?? ""}
                    onSave={(v) => updateField("name", v)}
                    placeholder="Nome do personagem"
                    className="text-lg font-bold block w-full"
                    style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
                  />
                  <InlineEdit
                    value={char.playerName ?? ""}
                    onSave={(v) => updateField("playerName", v)}
                    placeholder="Nome do jogador"
                    className="text-sm block w-full"
                    style={{ color: "var(--muted-foreground)" }}
                  />
                  <InlineEdit
                    value={char.rpgSystem ?? ""}
                    onSave={(v) => updateField("rpgSystem", v)}
                    placeholder="Sistema de RPG"
                    className="text-xs block w-full"
                    style={{ color: "var(--muted-foreground)" }}
                  />
                </div>
              </div>

              {/* Basic info - Dynamic fields */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                    Informações
                  </p>
                  {canEdit && (
                    <button
                      onClick={() => {
                        const newId = `info_${Date.now()}`;
                        const currentInfo = char.basicInfo ?? {};
                        updateField("basicInfo", {
                          ...currentInfo,
                          [newId]: { label: "Nova informação", value: "" },
                        });
                      }}
                      className="text-xs flex items-center gap-1 hover:opacity-70"
                      style={{ color: "var(--primary)" }}
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {/* Dynamic custom fields */}
                  {char.basicInfo && Object.entries(char.basicInfo).map(([id, info]) => (
                    <div key={id} className="flex items-center gap-2">
                      <InlineEdit
                        value={info.label}
                        onSave={(v) =>
                          updateField("basicInfo", {
                            ...char.basicInfo,
                            [id]: { ...info, label: v },
                          })
                        }
                        className="text-xs font-medium w-32 shrink-0"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                      <InlineEdit
                        value={info.value}
                        onSave={(v) =>
                          updateField("basicInfo", {
                            ...char.basicInfo,
                            [id]: { ...info, value: v },
                          })
                        }
                        placeholder="—"
                        className="text-sm flex-1"
                        style={{ color: "var(--foreground)" }}
                      />
                      {canEdit && (
                        <button
                          onClick={() => {
                            const newInfo = { ...char.basicInfo };
                            delete newInfo[id];
                            updateField("basicInfo", newInfo);
                          }}
                          className="text-xs flex items-center gap-1 hover:opacity-70"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!char.basicInfo || Object.keys(char.basicInfo).length === 0) && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Nenhuma informação adicionada</p>
                  )}
                </div>
              </div>

              {/* Resources */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                    Recursos
                  </p>
                  {canEdit && (
                    <button onClick={addResource} className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: "var(--primary)" }}>
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  )}
                </div>
                {resources.map((r) => (
                  <ResourceBar
                    key={r.id}
                    resource={{ ...r, current: r.current ?? 0, max: r.max ?? 10, color: r.color ?? '#6366f1' }}
                    canEdit={canEdit}
                    onUpdate={(patch) => handleResUpdate(r.id, patch)}
                    onDelete={() => handleResDelete(r.id)}
                  />
                ))}
                {resources.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Nenhum recurso</p>
                )}
              </div>

              {/* Wallpaper controls */}
              {isOwner && (
                <div
                  className="rounded-2xl p-4"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--primary)" }}>
                    Wallpaper
                  </p>
                  <button
                    onClick={() => handleImageUpload("wallpaperUrl")}
                    className="flex items-center gap-2 text-sm w-full px-3 py-2 rounded-lg transition-all hover:opacity-80"
                    style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <Image className="w-4 h-4" />
                    {char.wallpaperUrl ? "Trocar wallpaper" : "Adicionar wallpaper"}
                  </button>
                  {char.wallpaperUrl && (
                    <div className="mt-3">
                      <label className="text-xs mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                        Transparência: {transparencyPercent}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={transparencyPercent}
                        onChange={(e) => {
                          const transparencyVal = parseFloat(e.target.value);
                          const opacityVal = 1 - (transparencyVal / 100);
                          // Update local state immediately for real-time feedback
                          setWallpaperOpacity(opacityVal);
                          // Save to database
                          updateField("wallpaperOpacity", opacityVal);
                        }}
                        className="w-full"
                      />
                      <button
                        onClick={() => updateField("wallpaperUrl", null)}
                        className="mt-2 text-xs flex items-center gap-1 hover:opacity-70"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <X className="w-3 h-3" /> Remover wallpaper
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CENTER + RIGHT COLUMNS */}
            <div className="lg:col-span-2 space-y-5">
              {/* Attributes */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                    Atributos
                  </p>
                  {canEdit && (
                    <button onClick={addAttribute} className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: "var(--primary)" }}>
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="p-3 rounded-xl text-center relative group"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                    >
                      {canEdit && (
                        <button
                          onClick={() => handleAttrDelete(attr.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <InlineEdit
                        value={String(attr.value)}
                        onSave={(v) => handleAttrUpdate(attr.id, { value: parseInt(v) || 0 })}
                        className="text-2xl font-bold block text-center w-full"
                        style={{ color: "var(--primary)", fontFamily: "'Cinzel', serif" }}
                      />
                      <InlineEdit
                        value={attr.label}
                        onSave={(v) => handleAttrUpdate(attr.id, { label: v })}
                        className="text-xs font-medium block text-center w-full mt-1"
                        style={{ color: "var(--muted-foreground)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills/Perícias */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--primary)" }}>
                  Perícias
                </p>
                <div className="space-y-4">
                  {getSkillCategories().map((category) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                          {category}
                        </p>
                        {canEdit && (
                          <button
                            onClick={() => addSkill(category)}
                            className="text-xs flex items-center gap-1 hover:opacity-70"
                            style={{ color: "var(--primary)" }}
                          >
                            <Plus className="w-3 h-3" /> Adicionar
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {skills
                          .filter((s) => (s.category || "Geral") === category)
                          .map((sk) => (
                            <div
                              key={sk.id}
                              className="flex items-center gap-3 p-3 rounded-xl group relative"
                              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                            >
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setSkills((prev) => prev.filter((s) => s.id !== sk.id));
                                    deleteSkill.mutate({ id: sk.id, shareToken, ownerId: char.ownerId });
                                    socketRef.current?.emit("character-change", uid);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: "var(--muted-foreground)" }}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <InlineEdit
                                  value={sk.name}
                                  onSave={(v) => handleSkillUpdate(sk.id, { name: v })}
                                  className="text-sm font-semibold block w-full"
                                  style={{ color: "var(--foreground)" }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                {canEdit ? (
                                  <input
                                    type="number"
                                    value={sk.value ?? 0}
                                    onChange={(e) => handleSkillUpdate(sk.id, { value: parseInt(e.target.value) || 0 })}
                                    className="w-12 px-2 py-1 rounded text-xs font-semibold text-center"
                                    style={{ background: "var(--secondary)", color: "var(--primary)", border: "1px solid var(--border)" }}
                                  />
                                ) : (
                                  <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
                                    {sk.value ?? 0}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                  {skills.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Nenhuma perícia</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => addSkill("Geral")}
                    className="mt-4 w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.75rem", fontWeight: "600" }}
                  >
                    <Plus className="w-4 h-4" /> Adicionar Perícia
                  </button>
                )}
              </div>

              {/* Inventory */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
                    Inventário
                  </p>
                  {canEdit && (
                    <button onClick={addItem} className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: "var(--primary)" }}>
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl group relative"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                    >
                      {canEdit && (
                        <button
                          onClick={() => {
                            setItems((prev) => prev.filter((i) => i.id !== item.id));
                            deleteItem.mutate({ id: item.id, shareToken, ownerId: char.ownerId });
                            socketRef.current?.emit("character-change", uid);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <InlineEdit
                          value={item.name}
                          onSave={(v) => handleItemUpdate(item.id, { name: v })}
                          className="text-sm font-medium block w-full"
                          style={{ color: "var(--foreground)" }}
                        />
                        <InlineEdit
                          value={item.description ?? ""}
                          onSave={(v) => handleItemUpdate(item.id, { description: v })}
                          placeholder="Descrição..."
                          className="text-xs block w-full mt-0.5"
                          style={{ color: "var(--muted-foreground)" }}
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <button
                            onClick={() => handleItemUpdate(item.id, { quantity: Math.max(0, (item.quantity ?? 1) - 1) })}
                            className="w-5 h-5 rounded flex items-center justify-center hover:opacity-70"
                            style={{ background: "var(--card)" }}
                          >
                            <Minus className="w-3 h-3" style={{ color: "var(--foreground)" }} />
                          </button>
                        )}
                        <span className="text-xs font-mono w-6 text-center" style={{ color: "var(--foreground)" }}>
                          {item.quantity ?? 1}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => handleItemUpdate(item.id, { quantity: (item.quantity ?? 1) + 1 })}
                            className="w-5 h-5 rounded flex items-center justify-center hover:opacity-70"
                            style={{ background: "var(--card)" }}
                          >
                            <Plus className="w-3 h-3" style={{ color: "var(--foreground)" }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Inventário vazio</p>
                  )}
                </div>
              </div>

              {/* Lore */}
              {char.loreVisible !== false && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <InlineEdit
                      value={char.loreLabel ?? "História & Anotações"}
                      onSave={(v) => updateField("loreLabel", v)}
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--primary)" }}
                    />
                    {isOwner && (
                      <button
                        onClick={() => updateField("loreVisible", false)}
                        className="text-xs hover:opacity-70"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <InlineEdit
                    value={char.loreContent ?? ""}
                    onSave={(v) => updateField("loreContent", v)}
                    placeholder="Escreva a história, lore e anotações do personagem..."
                    className="text-sm block w-full leading-relaxed"
                    style={{ color: "var(--foreground)" }}
                    multiline
                  />
                </div>
              )}
              {isOwner && char.loreVisible === false && (
                <button
                  onClick={() => updateField("loreVisible", true)}
                  className="text-xs flex items-center gap-1 hover:opacity-70"
                  style={{ color: "var(--primary)" }}
                >
                  <Plus className="w-3 h-3" /> Mostrar Lore & Anotações
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share modal */}
      {showShare && isOwner && (
        <ShareModal characterUid={char.uid} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
