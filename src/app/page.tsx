import { getVenues } from "@/lib/venues";
import HappyHourApp from "@/components/HappyHourApp";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; deleted?: string }>;
}) {
  const venues = await getVenues();
  const params = await searchParams;

  return (
    <HappyHourApp
      initialVenues={venues}
      initialVenueId={params.venue}
      showDeletedMessage={params.deleted === "1"}
    />
  );
}
