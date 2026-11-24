import Image from "next/image";
import { apiGet } from "@/lib/api-server";
import type { Destination } from "@/lib/types";

export async function AuthLayout({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  const bg = await apiGet<Destination>("/destinations/song-kol", 3600).catch(() => null);
  const photo = bg?.photos[0];
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      <div className="relative hidden bg-forest lg:block">
        {photo && <Image src={photo.url} alt={photo.alt} fill sizes="50vw" className="object-cover opacity-80" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 to-transparent" />
        <p className="absolute bottom-12 left-12 max-w-md font-display text-4xl leading-tight text-white">
          Сохраняйте маршруты, считайте сметы и отправляйте заявки операторам.
        </p>
      </div>
      <div className="flex items-center justify-center px-5 pt-[calc(var(--header-h)+32px)] pb-16">
        <div className="w-full max-w-md">
          <h1 className="h-display text-[40px] text-forest">{title}</h1>
          <p className="mt-2 mb-8 text-stone">{text}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
