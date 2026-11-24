import { notFound } from "next/navigation";
import { ContentEditor } from "@/components/admin/ContentEditor";

const KINDS = ["destinations", "poi", "articles"] as const;

export default async function ContentEditPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!KINDS.includes(type as (typeof KINDS)[number])) notFound();
  return <ContentEditor kind={type as (typeof KINDS)[number]} id={id === "new" ? null : id} />;
}
