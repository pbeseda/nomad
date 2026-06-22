import { getWesternSites } from "../lib/sites";
import { Atlas } from "../components/atlas/Atlas";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sites = await getWesternSites();
  return <Atlas sites={sites} />;
}
