"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function HeroSearch() {
  const { L } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [error, setError] = useState(false);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length < 2) return setError(true);
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex w-full max-w-xl items-center gap-2 rounded-sm bg-white/95 p-1.5 pl-4 shadow-2xl backdrop-blur"
    >
      <Search size={18} className="shrink-0 text-stone" aria-hidden />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setError(false);
        }}
        aria-label={L("Куда вы хотите поехать?")}
        aria-invalid={error}
        placeholder={error ? L("Введите хотя бы 2 символа") : L("Куда хотите поехать? Озеро, город, ущелье…")}
        className={`min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-graphite focus:outline-none ${error ? "placeholder:text-clay" : "placeholder:text-stone/70"}`}
      />
      <button type="submit" className="btn-primary !py-2.5">
        {L("Найти")}
      </button>
    </form>
  );
}
