import { TourEditor } from "@/components/operator/TourEditor";

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourEditor id={id} />;
}
