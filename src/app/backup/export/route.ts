import { requireSession } from "@/lib/auth/session";
import { serializeTfsaBackup } from "@/lib/tfsa/backup";
import { getFullBackupData } from "@/lib/tfsa/data";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  const json = serializeTfsaBackup(await getFullBackupData());
  const date = new Date().toISOString().slice(0, 10);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tfsa-full-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
