import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import QRCode from "qrcode";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ruangan = await prisma.ruangan.findUnique({
      where: { id },
    });

    if (!ruangan) {
      return NextResponse.json(
        { error: "Ruangan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Generate QR sebagai PNG buffer
    const qrBuffer = await QRCode.toBuffer(ruangan.kodeQr, {
      width: 400,
      margin: 2,
    });

    // Return sebagai HTML halaman cetak
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${ruangan.nama}</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: white;
            }
            .card {
              border: 2px solid #e5e7eb;
              border-radius: 16px;
              padding: 32px;
              text-align: center;
              width: 320px;
            }
            h1 { font-size: 14px; color: #6366f1; margin-bottom: 4px; }
            h2 { font-size: 22px; font-weight: bold; color: #111827; margin: 0 0 16px; }
            img { width: 240px; height: 240px; }
            p { font-size: 12px; color: #9ca3af; margin-top: 16px; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>EduPresence</h1>
            <h2>${ruangan.nama}</h2>
            <img src="data:image/png;base64,${qrBuffer.toString("base64")}" />
            <p>Scan QR ini untuk absensi</p>
          </div>
          <button
            onclick="window.print()"
            style="margin-top:24px; padding:10px 24px; background:#6366f1; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px;"
          >
            🖨️ Cetak
          </button>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
