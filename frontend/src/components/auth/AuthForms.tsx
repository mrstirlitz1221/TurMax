"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { homeFor, useAuth } from "./AuthProvider";
import { errorMessage, HttpError } from "@/lib/api-client";
import { useI18n } from "@/i18n/client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm() {
  const { L } = useI18n();
  const { login } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setErr(L("Введите корректный e-mail"));
    if (!password) return setErr(L("Введите пароль"));
    setBusy(true);
    setErr(null);
    try {
      const u = await login(email.trim(), password);
      router.push(safeNext(sp.get("next")) ?? homeFor(u));
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <label htmlFor="l-email" className="label">E-mail</label>
        <input id="l-email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="l-pass" className="label">{L("Пароль")}</label>
        <input id="l-pass" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {err && <p className="text-[14px] text-clay" role="alert">{err}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5">{busy ? L("Входим…") : L("Войти")}</button>
      <p className="text-center text-[14px] text-stone">
        {L("Нет аккаунта?")} <Link href={`/register${sp.get("next") ? `?next=${encodeURIComponent(sp.get("next")!)}` : ""}`} className="font-semibold text-forest underline">{L("Зарегистрироваться")}</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { L } = useI18n();
  const { register } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [type, setType] = useState<"tourist" | "operator">(sp.get("type") === "operator" ? "operator" : "tourist");
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "", password2: "", companyName: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.fullName.trim().length < 2) er.fullName = L("Укажите имя");
    if (!EMAIL.test(f.email.trim())) er.email = L("Введите корректный e-mail");
    if (f.phone && !/^\+?[0-9\s()-]{9,20}$/.test(f.phone)) er.phone = L("Неверный формат телефона");
    if (f.password.length < 8) er.password = L("Пароль — не короче 8 символов");
    else if (!/[A-Za-zА-Яа-я]/.test(f.password) || !/\d/.test(f.password)) er.password = L("Используйте буквы и цифры");
    if (f.password !== f.password2) er.password2 = L("Пароли не совпадают");
    if (type === "operator" && f.companyName.trim().length < 2) er.companyName = L("Укажите название компании");
    if (!f.consent) er.consent = L("Необходимо согласие на обработку персональных данных");
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const u = await register({
        email: f.email.trim(), password: f.password, fullName: f.fullName.trim(), phone: f.phone.trim() || undefined,
        accountType: type, companyName: type === "operator" ? f.companyName.trim() : undefined, consent: f.consent,
      });
      router.push(safeNext(sp.get("next")) ?? homeFor(u));
      router.refresh();
    } catch (e) {
      if (e instanceof HttpError && e.details) setErrors(Object.fromEntries(Object.entries(e.details).map(([k, v]) => [k, v[0]])));
      setErrors((s) => ({ ...s, form: errorMessage(e) }));
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`r-${k}`} className="label">{label}</label>
      <input id={`r-${k}`} className="field" value={f[k] as string} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `r-${k}-e` : undefined} {...props} />
      {errors[k] && <p id={`r-${k}-e`} className="mt-1 text-[13px] text-clay">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-sm bg-mist p-1" role="radiogroup" aria-label={L("Тип аккаунта")}>
        {(["tourist", "operator"] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)} className={`rounded-xs py-2 text-[14px] font-semibold ${type === t ? "bg-white text-forest shadow-sm" : "text-stone"}`}>
            {t === "tourist" ? L("Я путешественник") : L("Я туроператор / гид")}
          </button>
        ))}
      </div>
      {type === "operator" && (
        <>
          <p className="rounded-sm bg-sand-light p-3 text-[13.5px] text-stone">{L("Профиль оператора проверяет администратор. До проверки туры можно готовить, но они не будут видны в каталоге.")}</p>
          {field("companyName", L("Название компании"), { autoComplete: "organization" })}
        </>
      )}
      {field("fullName", L("Имя и фамилия"), { autoComplete: "name" })}
      {field("email", "E-mail", { type: "email", autoComplete: "email" })}
      {field("phone", L("Телефон (необязательно)"), { type: "tel", autoComplete: "tel", placeholder: "+996 …" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("password", L("Пароль"), { type: "password", autoComplete: "new-password" })}
        {field("password2", L("Повторите пароль"), { type: "password", autoComplete: "new-password" })}
      </div>
      <label className="flex gap-2.5 text-[13.5px] leading-snug text-stone">
        <input type="checkbox" checked={f.consent} onChange={set("consent")} className="mt-0.5 accent-forest" />
        <span>{L("Согласен на обработку персональных данных для работы с заявками в соответствии с законодательством Кыргызской Республики.")}</span>
      </label>
      {errors.consent && <p className="text-[13px] text-clay">{errors.consent}</p>}
      {errors.form && <p className="text-[14px] text-clay" role="alert">{errors.form}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full !py-3.5">{busy ? L("Создаём аккаунт…") : L("Зарегистрироваться")}</button>
      <p className="text-center text-[14px] text-stone">
        {L("Уже есть аккаунт?")} <Link href="/login" className="font-semibold text-forest underline">{L("Войти")}</Link>
      </p>
    </form>
  );
}
