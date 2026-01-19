const TELEMETRY_HOST = process.env.TELEMETRY_HOST || "telemetry";
const TELEMETRY_PORT = process.env.TELEMETRY_PORT || "8081";
const TELEMETRY_URL = `http://${TELEMETRY_HOST}:${TELEMETRY_PORT}/log`;

interface LogRequest {
  level: string;
  message: string;
  log_id?: string;
  source: string;
}

export async function log(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  logId?: string,
): Promise<void> {
  const request: LogRequest = {
    level,
    message,
    log_id: logId,
    source: "webservice",
  };

  try {
    await fetch(TELEMETRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (error) {
    console.error("Failed to send log to telemetry:", error);
  }
}

export function getLogIdFromHeaders(headers: Headers): string | undefined {
  return headers.get("x-log-id") || undefined;
}
