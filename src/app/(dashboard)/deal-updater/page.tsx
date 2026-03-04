import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DealUpdaterApp from "@/components/deal-updater/DealUpdaterApp";

export default async function DealUpdaterPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  return <DealUpdaterApp initialVenueId={params.venueId} />;
}
