"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { User } from "@/lib/types";

export function ProfileForm({ allowDelete = false }: { allowDelete?: boolean }) {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg({ ok: false, text: "Укажите имя" });
    try {
      setUser(await api<User>("/auth/me", { method: "PUT", body: { fullName: name.trim(), phone: phone.trim() || null } }));
      setMsg({ ok: true, text: "Сохранено" });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  };
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return setPwMsg({ ok: false, text: "Новый пароль — не короче 8 символов" });
    try {
      await api("/auth/change-password", { body: { currentPassword: pw.current, newPassword: pw.next } });
      setPw({ current: "", next: "" });
      setPwMsg({ ok: true, text: "Пароль изменён. На других устройствах потребуется войти заново." });
    } catch (e) {
      setPwMsg({ ok: false, text: errorMessage(e) });
    }
  };
  const remove = async () => {
    if (!confirm("Удалить аккаунт? Персональные данные будут обезличены, восстановить аккаунт нельзя.")) return;
    try {
      await api("/auth/me", { method: "DELETE" });
      await logout().catch(() => {});
      router.push("/");
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  };

  return (
    <div className="grid max-w-4xl gap-10 md:grid-cols-2">
      <form onSubmit={save} className="card space-y-4 p-6" noValidate>
        <h2 className="font-display text-2xl text-forest">Профиль</h2>
        <div><label htmlFor="p-email" className="label">E-mail</label><input id="p-email" className="field bg-mist" value={user?.email ?? ""} disabled /></div>
        <div><label htmlFor="p-name" className="label">Имя</label><input id="p-name" className="field" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label htmlFor="p-phone" className="label">Телефон</label><input id="p-phone" type="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-turquoise" : "text-clay"}`} role="status">{msg.text}</p>}
        <button className="btn-primary">Сохранить</button>
      </form>
      <div className="space-y-6">
        <form onSubmit={changePw} className="card space-y-4 p-6" noValidate>
          <h2 className="font-display text-2xl text-forest">Смена пароля</h2>
          <div><label htmlFor="p-cur" className="label">Текущий пароль</label><input id="p-cur" type="password" autoComplete="current-password" className="field" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>
          <div><label htmlFor="p-new" className="label">Новый пароль</label><input id="p-new" type="password" autoComplete="new-password" className="field" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
          {pwMsg && <p className={`text-[14px] ${pwMsg.ok ? "text-turquoise" : "text-clay"}`} role="status">{pwMsg.text}</p>}
          <button className="btn-outline">Изменить пароль</button>
        </form>
        {allowDelete && (
          <div className="rounded-sm border border-clay/25 p-6">
            <h2 className="font-display text-xl text-clay">Удаление аккаунта</h2>
            <p className="mt-2 text-[14px] text-stone">Имя, e-mail и телефон будут обезличены. Сначала отмените активные заявки.</p>
            <button onClick={remove} className="btn-danger mt-4">Удалить аккаунт</button>
          </div>
        )}
      </div>
    </div>
  );
}
