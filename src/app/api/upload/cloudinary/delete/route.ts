import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudunary";

export async function POST(req: Request) {
  const { public_id } = await req.json();

  if (!public_id) {
    return NextResponse.json({ error: "Falta public_id" }, { status: 400 });
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return NextResponse.json({ result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
