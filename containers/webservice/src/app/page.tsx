import { headers } from "next/headers";
import { log, getLogIdFromHeaders } from "@/lib/telemetry";
import Shell from "./components/shell";

async function getServiceStatus() {
  const headersList = headers();
  const logId = getLogIdFromHeaders(headersList);

  await log("info", "Home page rendered (SSR)", logId);

  return {
    service: "webservice",
    status: "ok",
    timestamp: new Date().toISOString(),
    logId: logId || "N/A",
  };
}

export default async function Home() {
  const status = await getServiceStatus();

  return (
    <main>
      <Shell />
    </main>
  );
}
