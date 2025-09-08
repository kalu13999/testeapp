import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  const ip =
    forwardedFor?.split(",")[0]?.trim() || // pode vir "ip1, ip2"
    realIp ||
    "IP não identificado";

  return NextResponse.json({ ip: ip.replace("::ffff:", "") });
}
