import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export function GET() {
  const raw = fs.readFileSync(path.join(process.cwd(), "openapi.json"), "utf8");
  const spec = JSON.parse(raw);
  return NextResponse.json(spec);
}
