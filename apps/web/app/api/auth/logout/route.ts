import { NextResponse } from "next/server";
import { TOKEN_COOKIE, MEMBER_COOKIE } from "@/lib/auth-cookie";

export async function POST() {
  const res = NextResponse.json({
    success: true,
    code: "OK",
    message: "OK",
    data: null,
  });
  res.cookies.delete(TOKEN_COOKIE);
  res.cookies.delete(MEMBER_COOKIE);
  return res;
}
