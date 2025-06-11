import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({
    message: "Test API working!",
    timestamp: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Test API GET working!",
    timestamp: new Date().toISOString(),
  });
}
