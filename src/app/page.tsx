import { getVenues } from "@/lib/venues";
import HappyHourApp from "@/components/HappyHourApp";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function Home() {
  const venues = await getVenues();

  return <HappyHourApp initialVenues={venues} />;
}
