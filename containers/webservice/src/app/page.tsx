import { headers } from "next/headers";
import { log, getLogIdFromHeaders } from "@/lib/telemetry";
import Header from "./components/header";
import Body from "./components/body";

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
    <div className="lg:pl-72">
      <Header />
      <main className="py-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <Body />
        </div>
      </main>
    </div>
  );
}
