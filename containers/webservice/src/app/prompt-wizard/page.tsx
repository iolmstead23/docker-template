import { headers } from "next/headers";
import { log, getLogIdFromHeaders } from "@/lib/telemetry";
import PromptHeader from "./components/PromptHeader";
import PromptBody from "./components/PromptBody";

async function getServiceStatus() {
  const headersList = headers();
  const logId = getLogIdFromHeaders(headersList);

  await log("info", "Prompt Wizard page rendered (SSR)", logId);

  return {
    service: "webservice",
    status: "ok",
    timestamp: new Date().toISOString(),
    logId: logId || "N/A",
  };
}

export default async function PromptWizardPage() {
  // Log service status for telemetry (return value used for logging side effect)
  await getServiceStatus();

  return (
    <div className="lg:pl-72">
      <PromptHeader />
      <main className="py-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <PromptBody />
        </div>
      </main>
    </div>
  );
}
