import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  }
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
