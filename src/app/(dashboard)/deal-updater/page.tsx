import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DealUpdaterApp from "@/components/deal-updater/DealUpdaterApp";

export default async function DealUpdaterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DealUpdaterApp />;
}
