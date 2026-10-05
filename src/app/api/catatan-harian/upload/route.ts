import { Role } from "@/generated/prisma/client";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type SessionUserWithRoles = {
  role?: string;
  roles?: string[];
};

function getSessionRoles(user: SessionUserWithRoles | undefined) {
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .filter((role): role is string => typeof role === "string")
    .filter((role) => Object.values(Role).includes(role as Role))
    .map((role) => role as Role);

  return new Set<Role>(roles);
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionRoles = getSessionRoles(session.user as SessionUserWithRoles);

    if (!sessionRoles.has(Role.STAFF)) {
      return NextResponse.json(
        {
          error: "Hanya staff yang dapat mengupload foto catatan harian",
        },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File tidak ditemukan" },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung" },
        { status: 400 },
      );
    }

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
      .from("catatan-harian")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("CATATAN_HARIAN_UPLOAD_ERROR:", error);

      return NextResponse.json({ error: "Gagal upload foto" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("catatan-harian")
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error("CATATAN_HARIAN_UPLOAD_ERROR:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
