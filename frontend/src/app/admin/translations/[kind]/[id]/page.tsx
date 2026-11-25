import { notFound } from "next/navigation";
import { TranslationEditor } from "@/components/admin/TranslationEditor";

const KINDS = ["destinations", "poi", "articles", "tours", "categories", "regions"];

export default async function TranslationPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!KINDS.includes(kind)) notFound();
  return <TranslationEditor kind={kind} id={id} />;
}
