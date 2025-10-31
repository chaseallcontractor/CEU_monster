import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { defineSecret } from "firebase-functions/params";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import postmark from "postmark";

// ---- Secrets (Gen-2 friendly) ----
const POSTMARK_API_KEY = defineSecret("POSTMARK_API_KEY");

// Gen-2 global options
setGlobalOptions({ region: "us-central1" });

// ---- Optional BCC for QA/audit ----
const ENABLE_CERT_BCC = true; // set false to disable
const CERT_BCC_EMAIL = "support@ceumonster.com";

initializeApp();

/** ===== Types ===== */
type Redemption = {
  certId: string; // usually "default"
  learnerEmail: string;
  learnerName?: string | null;
  licenseNumber?: string | null;
  status: "pending" | "test" | "processed";
  createdAt?: unknown;
};

type CertTemplate = {
  title: string;
  ceuHours: number;
  issuerOrgName: string;
  instructorName?: string | null;
  logoUrl?: string | null;
  qrMode?: "live" | "test";
  ownerUid: string;
  maxIssues?: number;
  issuedCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/** ===== Email HTML Helper (branding) ===== */
function buildBrandedHtmlEmail(params: { toName: string; signedUrl: string; subject: string }) {
  const { toName, signedUrl, subject } = params;
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${subject}</title>
      <style>
        .container { max-width: 560px; margin: 0 auto; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji", "Segoe UI Symbol"; color: #111827; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
        .btn { display: inline-block; padding: 12px 18px; text-decoration: none; border-radius: 8px; border: 1px solid #1f2937; }
        .muted { color: #6b7280; font-size: 12px; }
        .logo { height: 32px; }
        h1 { font-size: 20px; margin: 0 0 8px; }
        p { line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <img class="logo" src="https://storage.googleapis.com/public-ceu-monster-assets/logo-dark.png" alt="CEU Monster" />
          <div style="font-weight:600">CEU Monster</div>
        </div>

        <div class="card">
          <h1>Your CEU Certificate is Ready</h1>
          <p>Hi ${toName},</p>
          <p>Thanks for attending! Your CEU certificate has been generated. Click below to download your PDF.</p>

          <p style="margin: 18px 0;">
            <a class="btn" href="${signedUrl}" target="_blank" rel="noopener noreferrer">
              Download your certificate (PDF)
            </a>
          </p>

          <p class="muted">If you didn’t expect this, you can safely ignore this email.</p>
        </div>

        <p class="muted" style="margin-top:16px">
          Sent by CEU Monster · <a href="https://ceumonster.com">ceumonster.com</a>
        </p>
      </div>
    </body>
  </html>`;
}

/** ===== PDF Generation ===== */
async function generateCertificatePdf(input: {
  learnerName: string;
  learnerEmail: string;
  classId: string;
  redeemId: string;
  template: CertTemplate | null;
  licenseNumber?: string | null;
}) {
  const { learnerName, learnerEmail, classId, redeemId, template, licenseNumber } = input;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: rgb(1, 1, 1) });

  const title = template?.title ?? "Continuing Education Certificate";
  page.drawText(title, { x: 60, y: 515, size: 28, font: bold, color: rgb(0.1, 0.1, 0.1) });

  const org = template?.issuerOrgName ?? "Issuer Organization";
  page.drawText(`Issued by: ${org}`, { x: 60, y: 485, size: 14, font, color: rgb(0.2, 0.2, 0.2) });

  const instructor = template?.instructorName?.trim();
  if (instructor) {
    page.drawText(`Instructor: ${instructor}`, { x: 60, y: 465, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
  }

  page.drawText("Awarded to:", { x: 60, y: 430, size: 14, font: bold, color: rgb(0.15, 0.15, 0.15) });
  page.drawText(learnerName || learnerEmail, { x: 60, y: 405, size: 22, font: bold, color: rgb(0, 0, 0) });

  const hours = template?.ceuHours ?? 0;
  const lines = [
    `CEU Hours: ${hours}`,
    `Class ID: ${classId}`,
    `Certificate ID: ${redeemId}`,
    `Mode: ${template?.qrMode ?? "live"}`,
    ...(licenseNumber ? [`License Number: ${licenseNumber}`] : []),
  ];
  lines.forEach((t, i) => {
    page.drawText(t, { x: 60, y: 360 - i * 22, size: 14, font, color: rgb(0.2, 0.2, 0.2) });
  });

  page.drawText("Generated by CEU Monster", { x: 60, y: 60, size: 10, font, color: rgb(0.5, 0.5, 0.5) });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

/** ===== Storage Upload ===== */
async function uploadToStorage(params: { buffer: Buffer; classId: string; redeemId: string }) {
  const { buffer, classId, redeemId } = params;
  const bucket = getStorage().bucket(); // uses the default <project>.appspot.com bucket
  const path = `certificates/${classId}/${redeemId}.pdf`;
  const file = bucket.file(path);

  await file.save(buffer, {
    contentType: "application/pdf",
    resumable: false,
    metadata: { cacheControl: "public, max-age=3600" },
  });

  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { path, signedUrl };
}

/** ===== Small helper to write back processed state ===== */
async function writeProcessed(docPath: string, extras: Record<string, unknown> = {}) {
  const db = getFirestore();
  await db.doc(docPath).set(
    {
      status: "processed",
      processedAt: FieldValue.serverTimestamp(),
      ...extras,
    },
    { merge: true }
  );
}

/** ===== Trigger ===== */
export const onRedemptionCreated = onDocumentCreated(
  {
    document: "classes/{classId}/redemptions/{redeemId}",
    region: "us-central1",
    secrets: [POSTMARK_API_KEY],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const db = getFirestore();
    const { classId, redeemId } = event.params as { classId: string; redeemId: string };
    const docPath = `classes/${classId}/redemptions/${redeemId}`;
    const data = (snap.data() ?? {}) as Partial<Redemption>;

    const learnerEmail = String(data.learnerEmail ?? "");
    const learnerName = String(data.learnerName ?? learnerEmail);
    const licenseNumber = data.licenseNumber ?? null;
    const status = (data.status as Redemption["status"]) ?? "pending";
    const certId = (data.certId as string) || "default";

    console.log("Redemption created:", { classId, redeemId, email: learnerEmail || "(missing)", status, licenseNumber });

    // ----- Idempotency: skip if already processed
    if (status === "processed") {
      console.log("Doc already processed — skipping.");
      return;
    }

    // Load cert template (best effort)
    let template: CertTemplate | null = null;
    try {
      const tplRef = db.doc(`classes/${classId}/certificates/${certId}`);
      const tplSnap = await tplRef.get();
      template = tplSnap.exists ? (tplSnap.data() as CertTemplate) : null;
    } catch (e) {
      console.warn("Could not fetch certificate template:", e);
    }

    // Generate and upload PDF
    const pdfBuffer = await generateCertificatePdf({
      learnerName,
      learnerEmail,
      classId,
      redeemId,
      template,
      licenseNumber,
    });

    const { path, signedUrl } = await uploadToStorage({ buffer: pdfBuffer, classId, redeemId });
    console.log("Certificate uploaded:", { path });

    // Send email if configured and not a test
    const pmKey = POSTMARK_API_KEY.value();
    if (!pmKey) {
      console.warn("POSTMARK_API_KEY not set — skipping email send.");
      // still mark processed so it shows in the UI
      await writeProcessed(docPath, { certificatePath: path, certificateUrl: signedUrl });
      return;
    }

    if (status === "test") {
      console.log("Test mode — skipping email send.");
      await writeProcessed(docPath, { certificatePath: path, certificateUrl: signedUrl });
      return;
    }

    try {
      const client = new postmark.ServerClient(pmKey);
      const subject = (template?.title ?? "CEU Certificate") + " — Your Certificate";
      const toName = learnerName || learnerEmail;

      console.log("Attempting Postmark send to", learnerEmail, "stream=outbound");

      await client.sendEmail({
        From: "CEU Monster <no-reply@ceumonster.com>",
        To: learnerEmail,
        Bcc: ENABLE_CERT_BCC ? CERT_BCC_EMAIL : undefined,
        Subject: subject,
        TextBody:
          `Hi ${toName},\n\n` +
          `Thanks for attending! Your CEU certificate is ready. Download it here:\n${signedUrl}\n\n` +
          `If you didn’t expect this, please ignore this email.\n\n— CEU Monster`,
        HtmlBody: buildBrandedHtmlEmail({ toName, signedUrl, subject }),
        MessageStream: "outbound",
      });

      console.log("Email sent via Postmark to", learnerEmail);

      // SUCCESS: write processed + storage fields
      await writeProcessed(docPath, { certificatePath: path, certificateUrl: signedUrl });
      return;
    } catch (e: any) {
      console.error("Email send failed:", e);

      const errMsg = e?.message ?? e?.ErrorMessage ?? (typeof e === "string" ? e : JSON.stringify(e));

      await db.doc(docPath).set(
        {
          emailError: errMsg,
          emailErrorAt: FieldValue.serverTimestamp(),
          // still return the certificate URL so the learner can get it elsewhere if needed
          certificatePath: path,
          certificateUrl: signedUrl,
        },
        { merge: true }
      );
      return;
    }
  }
);
