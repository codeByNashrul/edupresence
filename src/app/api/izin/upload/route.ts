import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !["GURU", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 },
      );
    }

    // Validasi tipe file
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Gunakan JPG, PNG, atau PDF" },
        { status: 400 },
      );
    }

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5MB" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const cleanFileName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();
    const fileName = `${session.user.id}/${Date.now()}-${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from("surat-izin")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: "Gagal upload file" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("surat-izin")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
