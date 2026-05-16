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
    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Key:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30));

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 },
      );
    }

    // Validasi tipe file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung" },
        { status: 400 },
      );
    }

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5MB" },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const cleanFileName = file.name
      .replace(/\s+/g, "-") // spasi → strip
      .replace(/[^a-zA-Z0-9._-]/g, "") // hapus karakter selain huruf, angka, titik, strip
      .toLowerCase();

    const fileName = `${session.user.id}/${Date.now()}-${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from("catatan-harian")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    console.log("Upload data:", data);
    console.log("Upload error:", error);

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: "Gagal upload foto" }, { status: 500 });
    }

    // Ambil public URL
    const { data: urlData } = supabase.storage
      .from("catatan-harian")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
