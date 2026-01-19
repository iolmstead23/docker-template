import { NextResponse } from "next/server";

export async function GET() {
  // Health check endpoint - no logging, handled by heartbeat service
  return NextResponse.json({
    status: "ok",
    service: "webservice",
    timestamp: new Date().toISOString(),
  });
}
