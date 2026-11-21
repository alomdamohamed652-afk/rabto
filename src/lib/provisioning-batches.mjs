/**
 * Split inserts into bounded groups so a large product batch does not create
 * oversized SQL statements. The caller controls transaction boundaries.
 */
export const PROVISIONING_INSERT_BATCH_SIZE = 250;

/**
 * @template T
 * @param {readonly T[]} rows
 * @param {number} [size]
 * @returns {T[][]}
 */
export function chunkRows(rows, size = PROVISIONING_INSERT_BATCH_SIZE) {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError("Batch size must be a positive integer.");
  }

  const chunks = [];
  for (let offset = 0; offset < rows.length; offset += size) {
    chunks.push(rows.slice(offset, offset + size));
  }
  return chunks;
}
