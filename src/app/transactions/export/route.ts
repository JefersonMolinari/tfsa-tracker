import { getTransactionsCsvExportData } from "../../../lib/tfsa/data";
import {
  buildTransactionsCsvFilename,
  serializeTransactionsToCsv,
} from "../../../lib/tfsa/exportTransactionsCsv";

export async function GET() {
  const transactions = await getTransactionsCsvExportData();
  const csv = serializeTransactionsToCsv(transactions);
  const filename = buildTransactionsCsvFilename();

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
