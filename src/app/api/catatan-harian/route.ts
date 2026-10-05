import { Role } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayJakarta } from "@/lib/time";

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

function parseTanggal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function tanggalRange(tanggal: Date) {
  const mulai = new Date(tanggal);
  mulai.setUTCHours(0, 0, 0, 0);

  const selesai = new Date(tanggal);
  selesai.setUTCHours(23, 59, 59, 999);

  return {
    gte: mulai,
    lte: selesai,
  };
}

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = getSessionRoles(session.user as SessionUserWithRoles);

    const isStaff = roles.has(Role.STAFF);
    const isManagement = roles.has(Role.ADMIN) || roles.has(Role.PIMPINAN);

    const { searchParams } = new URL(req.url);

    const scope = searchParams.get("scope") ?? "mine";

    /*
     * ============================================================
     * TEAM
     * Semua staff boleh melihat aktivitas SELURUH STAFF,
     * tetapi HANYA untuk hari ini.
     *
     * Parameter tanggal/userId sengaja diabaikan.
     * ============================================================
     */
    if (scope === "team") {
      if (!isStaff && !isManagement) {
        return NextResponse.json(
          {
            error: "Anda tidak memiliki akses ke aktivitas staff",
          },
          { status: 403 },
        );
      }

      const hariIni = todayJakarta();

      const catatan = await prisma.catatanHarian.findMany({
        where: {
          tanggal: tanggalRange(hariIni),

          user: {
            is: {
              aktif: true,

              OR: [
                {
                  role: Role.STAFF,
                },
                {
                  rolesTambahan: {
                    has: Role.STAFF,
                  },
                },
              ],
            },
          },
        },

        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nip: true,
            },
          },
        },

        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            user: {
              nama: "asc",
            },
          },
        ],
      });

      return NextResponse.json(catatan);
    }

    /*
     * ============================================================
     * MONITOR
     * Hanya ADMIN / PIMPINAN.
     * Boleh memilih tanggal dan staff.
     * ============================================================
     */
    if (scope === "monitor") {
      if (!isManagement) {
        return NextResponse.json(
          {
            error: "Anda tidak memiliki akses monitoring catatan staff",
          },
          { status: 403 },
        );
      }

      const tanggalStr = searchParams.get("tanggal");
      const userId = searchParams.get("userId");

      let tanggal: Date | undefined;

      if (tanggalStr) {
        const parsed = parseTanggal(tanggalStr);

        if (!parsed) {
          return NextResponse.json(
            {
              error: "Format tanggal tidak valid",
            },
            { status: 400 },
          );
        }

        tanggal = parsed;
      }

      const catatan = await prisma.catatanHarian.findMany({
        where: {
          ...(userId ? { userId } : {}),

          ...(tanggal
            ? {
                tanggal: tanggalRange(tanggal),
              }
            : {}),

          user: {
            is: {
              aktif: true,

              OR: [
                {
                  role: Role.STAFF,
                },
                {
                  rolesTambahan: {
                    has: Role.STAFF,
                  },
                },
              ],
            },
          },
        },

        include: {
          user: {
            select: {
              id: true,
              nama: true,
              nip: true,
            },
          },
        },

        orderBy: {
          tanggal: "desc",
        },
      });

      return NextResponse.json(catatan);
    }

    /*
     * ============================================================
     * MINE
     * Default untuk halaman Catatan Harian Saya.
     * Selalu dikunci ke session.user.id.
     * ============================================================
     */
    if (scope !== "mine") {
      return NextResponse.json(
        {
          error: "Scope catatan harian tidak valid",
        },
        { status: 400 },
      );
    }

    if (!isStaff) {
      return NextResponse.json(
        {
          error: "Hanya staff yang dapat membuka catatan harian pribadi",
        },
        { status: 403 },
      );
    }

    const tanggalStr = searchParams.get("tanggal");

    let tanggal: Date | undefined;

    if (tanggalStr) {
      const parsed = parseTanggal(tanggalStr);

      if (!parsed) {
        return NextResponse.json(
          {
            error: "Format tanggal tidak valid",
          },
          { status: 400 },
        );
      }

      tanggal = parsed;
    }

    const catatan = await prisma.catatanHarian.findMany({
      where: {
        userId: session.user.id,

        ...(tanggal
          ? {
              tanggal: tanggalRange(tanggal),
            }
          : {}),
      },

      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
          },
        },
      },

      orderBy: {
        tanggal: "desc",
      },
    });

    return NextResponse.json(catatan);
  } catch (error) {
    console.error("CATATAN_HARIAN_GET_ERROR:", error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = getSessionRoles(session.user as SessionUserWithRoles);

    if (!roles.has(Role.STAFF)) {
      return NextResponse.json(
        {
          error: "Hanya staff yang dapat mengisi catatan harian",
        },
        { status: 403 },
      );
    }

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Data catatan tidak valid",
        },
        { status: 400 },
      );
    }

    const raw = body as Record<string, unknown>;

    const kegiatan =
      typeof raw.kegiatan === "string" ? raw.kegiatan.trim() : "";

    const hasil = typeof raw.hasil === "string" ? raw.hasil.trim() : "";

    const kendala = typeof raw.kendala === "string" ? raw.kendala.trim() : null;

    const foto = Array.isArray(raw.foto)
      ? raw.foto.filter((item): item is string => typeof item === "string")
      : [];

    if (!kegiatan || !hasil) {
      return NextResponse.json(
        {
          error: "Kegiatan dan hasil wajib diisi",
        },
        { status: 400 },
      );
    }

    const tanggal = todayJakarta();

    const catatan = await prisma.catatanHarian.upsert({
      where: {
        userId_tanggal: {
          userId: session.user.id,
          tanggal,
        },
      },

      update: {
        kegiatan,
        hasil,
        kendala: kendala || null,
        foto,
      },

      create: {
        userId: session.user.id,
        tanggal,
        kegiatan,
        hasil,
        kendala: kendala || null,
        foto,
      },
    });

    return NextResponse.json(catatan);
  } catch (error) {
    console.error("CATATAN_HARIAN_POST_ERROR:", error);

    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 },
    );
  }
}
