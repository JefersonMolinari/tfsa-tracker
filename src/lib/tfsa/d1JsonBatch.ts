const MAX_D1_JSON_ROWS = 5_000;
const MAX_D1_JSON_BYTES = 1_500_000;

export function toBoundedD1JsonChunks<T>(records: T[]): string[] {
  const chunks: string[] = [];
  let encodedRecords: string[] = [];
  let chunkBytes = 2;

  for (const record of records) {
    const encodedRecord = JSON.stringify(record);
    const recordBytes = new TextEncoder().encode(encodedRecord).byteLength;

    if (recordBytes + 2 > MAX_D1_JSON_BYTES) {
      throw new Error("A TFSA import record is too large for D1.");
    }

    const separatorBytes = encodedRecords.length === 0 ? 0 : 1;
    if (
      encodedRecords.length === MAX_D1_JSON_ROWS ||
      chunkBytes + separatorBytes + recordBytes > MAX_D1_JSON_BYTES
    ) {
      chunks.push(`[${encodedRecords.join(",")}]`);
      encodedRecords = [];
      chunkBytes = 2;
    }

    encodedRecords.push(encodedRecord);
    chunkBytes += (encodedRecords.length === 1 ? 0 : 1) + recordBytes;
  }

  if (encodedRecords.length > 0) {
    chunks.push(`[${encodedRecords.join(",")}]`);
  }

  return chunks;
}
