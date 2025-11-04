"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import * as QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type CertTemplate = {
  title: string;
  ceuHours: number;
  issuerOrgName?: string;
  logoUrl?: string;
  qrMode?: "live" | "test";
};

// Convert data:URL → bytes (works in browser and SSR without TS errors)
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  let binary: string;

  const hasAtob = typeof atob === "function";
  const hasBuffer = typeof (globalThis as any).Buffer !== "undefined";

  if (hasAtob) {
    binary = atob(base64);
  } else if (hasBuffer) {
    const BufferCtor = (globalThis as any).Buffer;
    binary = BufferCtor.from(base64, "base64").toString("binary");
  } else {
    throw new Error("No base64 decoding available");
  }

  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function CertificateQRPage() {
  const params = useParams();
  const classId = params?.id as string;
  const router = useRouter();

  const [tpl, setTpl] = useState<CertTemplate | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Prefer NEXT_PUBLIC_BASE_URL; fallback to window origin or prod domain.
  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_BASE_URL || "https://ceumonster.com";
  }, []);

  // Public page lives at /qr/[classId]
  const redeemUrl = `${baseUrl}/qr/${classId}`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const certRef = doc(db, "classes", classId, "certificates", "default");
        const snap = await getDoc(certRef);
        if (!snap.exists()) {
          throw new Error(
            "No certificate template found. Save it on the Certificate Template page first."
          );
        }

        const data = snap.data() as any;
        const template: CertTemplate = {
          title: data.title ?? "Untitled class",
          ceuHours: typeof data.ceuHours === "number" ? data.ceuHours : 0,
          issuerOrgName: data.issuerOrgName ?? "",
          logoUrl: data.logoUrl ?? "",
          qrMode: data.qrMode === "test" ? "test" : "live",
        };
        if (!mounted) return;
        setTpl(template);

        // Build QR for the public redeem URL
        const dataUrl = await QRCode.toDataURL(redeemUrl, { margin: 1, scale: 8 });
        if (mounted) setQrDataUrl(dataUrl);
      } catch (e: any) {
        console.error(e);
        if (mounted) setErr(e?.message || "Failed to load certificate template.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [classId, redeemUrl]);

  const downloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `CEU-QR-${classId}.png`;
    a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(redeemUrl);
      alert("Link copied to clipboard!");
    } catch {
      alert("Could not copy link.");
    }
  };

  const downloadSlidePdf = async () => {
    try {
      const pdf = await PDFDocument.create();
      // 16:9 slide — 1280x720
      const page = pdf.addPage([1280, 720]);

      // Background
      const white = rgb(1, 1, 1);
      const black = rgb(0, 0, 0);
      page.drawRectangle({ x: 0, y: 0, width: 1280, height: 720, color: white });

      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

      // Title
      const title = tpl?.title || "CEU Class";
      const titleSize = 40;
      const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
      page.drawText(title, {
        x: (1280 - titleWidth) / 2,
        y: 720 - 120,
        size: titleSize,
        font: fontBold,
        color: black,
      });

      // Subtitle (org • hours • TEST MODE)
      const parts: string[] = [];
      if (tpl?.issuerOrgName) parts.push(tpl.issuerOrgName);
      if (typeof tpl?.ceuHours === "number")
        parts.push(`${tpl.ceuHours} CEU hour${tpl.ceuHours === 1 ? "" : "s"}`);
      if (tpl?.qrMode === "test") parts.push("(TEST MODE)");
      const subtitle = parts.join(" • ");
      if (subtitle) {
        const subSize = 18;
        const subWidth = font.widthOfTextAtSize(subtitle, subSize);
        page.drawText(subtitle, {
          x: (1280 - subWidth) / 2,
          y: 720 - 160,
          size: subSize,
          font,
          color: black,
        });
      }

      // QR image (from data URL → bytes → embed)
      if (qrDataUrl) {
        const qrBytes = dataUrlToUint8Array(qrDataUrl);
        const qrPng = await pdf.embedPng(qrBytes);
        const qrSize = 380;
        page.drawImage(qrPng, {
          x: (1280 - qrSize) / 2,
          y: (720 - qrSize) / 2 - 30,
          width: qrSize,
          height: qrSize,
        });
      }

      // Short URL under QR
      const urlText = redeemUrl.replace(/^https?:\/\//, "");
      const urlSize = 16;
      const urlWidth = font.widthOfTextAtSize(urlText, urlSize);
      page.drawText(urlText, {
        x: (1280 - urlWidth) / 2,
        y: 140,
        size: urlSize,
        font,
        color: black,
      });

      // Optional logo (top-left)
      if (tpl?.logoUrl) {
        try {
          const res = await fetch(tpl.logoUrl);
          const bytes = await res.arrayBuffer();
          const isPng = tpl.logoUrl.toLowerCase().endsWith(".png");
          const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
          const maxW = 220;
          const maxH = 80;
          const scale = Math.min(maxW / img.width, maxH / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          page.drawImage(img, { x: 40, y: 720 - 40 - h, width: w, height: h });
        } catch {
          // ignore logo failures
        }
      }

      const bytes = await pdf.save();

// ✅ Copy into a fresh ArrayBuffer (avoids SharedArrayBuffer union issues)
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      const blob = new Blob([copy.buffer], { type: "application/pdf" });

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `CEU-QR-Slide-${classId}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert("Could not generate PDF slide.");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">QR & Slide</h1>
        <p className="opacity-70">Loading…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">QR & Slide</h1>
        <p className="text-red-600 mt-2">{err}</p>
        <button
          className="mt-4 rounded-xl border px-3 py-2 text-sm"
          onClick={() => router.push(`/dashboard/classes/${classId}/certificate`)}
        >
          Go to Certificate Template →
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">QR Preview & Slide Export</h1>
        <button
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() => router.push(`/dashboard/classes/${classId}/certificate`)}
        >
          ← Back to Template
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
          <div className="rounded-2xl border p-4">
            <div className="text-sm opacity-70 mb-2">Scan to redeem certificate</div>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code" className="w-full max-w-xs rounded-xl border mx-auto" />
            ) : (
              <div className="h-64 grid place-items-center text-sm opacity-70">Generating QR…</div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={downloadPng} className="rounded-xl border px-3 py-2 text-sm">
              Download QR (PNG)
            </button>
            <button onClick={downloadSlidePdf} className="rounded-xl border px-3 py-2 text-sm">
              Download Slide (PDF)
            </button>
            <button onClick={copyLink} className="rounded-xl border px-3 py-2 text-sm">
              Copy Link
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm opacity-70">Certificate details</div>
            <div className="mt-2 text-lg font-medium">{tpl?.title}</div>
            <div className="text-sm opacity-80">
              {tpl?.issuerOrgName ? `${tpl.issuerOrgName} • ` : ""}
              {tpl?.ceuHours ?? 0} CEU hour{tpl?.ceuHours === 1 ? "" : "s"}
              {tpl?.qrMode === "test" ? " • TEST MODE" : ""}
            </div>
          </div>

          {tpl?.logoUrl ? (
            <div className="rounded-2xl border p-4">
              <div className="text-sm opacity-70">Logo preview</div>
              <img src={tpl.logoUrl} alt="Logo" className="h-16 w-auto mt-2" />
            </div>
          ) : null}

          <div className="rounded-2xl border p-4">
            <div className="text-sm opacity-70 mb-1">Public redeem URL</div>
            <div className="text-sm break-all">{redeemUrl}</div>
            <div className="text-xs opacity-60 mt-1">
              Drop the PDF slide into PowerPoint and show it at the end of your class.
              Learners scan it to receive their certificate by email.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
