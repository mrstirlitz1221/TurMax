"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useI18n } from "@/i18n/client";

// Общий кеш идентификаторов избранного: один запрос на страницу вместо запроса на каждую карточку.
type Ids = { tours: Set<string>; destinations: Set<string> };
let ids: Ids | null = null;
let loading: Promise<void> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

function load(force = false) {
  if (loading && !force) return loading;
  loading = api<{ tours: string[]; destinations: string[] }>("/favorites/ids")
    .then((r) => {
      ids = { tours: new Set(r.tours), destinations: new Set(r.destinations) };
    })
    .catch(() => {
      ids = { tours: new Set(), destinations: new Set() };
    })
    .finally(emit);
  return loading;
}

export function FavoriteButton({ tourId, destinationId, light = false }: { tourId?: string; destinationId?: string; light?: boolean }) {
  const { L } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const snapshot = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => ids,
    () => null,
  );

  const isTourist = user?.role === "Tourist";
  useEffect(() => {
    if (isTourist) load();
    else if (ids) {
      ids = null;
      loading = null;
      emit();
    }
  }, [isTourist]);

  if (user && !isTourist) return null; // избранное — функция туриста (матрица доступа, табл. 2.8)

  const active = !!snapshot && (tourId ? snapshot.tours.has(tourId) : snapshot.destinations.has(destinationId!));

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const qs = tourId ? `tourId=${tourId}` : `destinationId=${destinationId}`;
      if (active) await api(`/favorites?${qs}`, { method: "DELETE" });
      else await api("/favorites", { body: tourId ? { tourId } : { destinationId } });
      await load(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? L("Убрать из избранного") : L("Добавить в избранное")}
      title={active ? L("В избранном") : L("В избранное")}
      className={`grid h-10 w-10 place-items-center rounded-full backdrop-blur-md transition duration-300 ${
        light ? "bg-black/25 text-white hover:bg-black/45" : "border border-graphite/15 bg-white text-forest hover:border-forest"
      }`}
    >
      <Heart size={18} className={active ? "fill-clay text-clay" : ""} />
    </button>
  );
}
