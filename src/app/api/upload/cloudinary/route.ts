import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudunary";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Convertimos a Buffer para Cloudinary
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise((resolve) => {
    cloudinary.uploader
      .upload_stream({ folder: "planos" }, (error, result) => {
        if (error || !result) {
          resolve(NextResponse.json({ error }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ url: result.secure_url }));
        }
      })
      .end(buffer);
  });
}
