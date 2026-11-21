import test from "node:test";
import assert from "node:assert/strict";
import { chunkRows, PROVISIONING_INSERT_BATCH_SIZE } from "../src/lib/provisioning-batches.mjs";

test("uses a conservative default insert batch size", () => {
  assert.equal(PROVISIONING_INSERT_BATCH_SIZE, 250);
});

test("returns no chunks for an empty input", () => {
  assert.deepEqual(chunkRows([]), []);
});

test("keeps a small input in one chunk and preserves order", () => {
  assert.deepEqual(chunkRows([1, 2, 3]), [[1, 2, 3]]);
});

test("splits rows at the configured boundary without losing or reordering rows", () => {
  const rows = Array.from({ length: 501 }, (_, index) => index);
  const chunks = chunkRows(rows, 250);

  assert.deepEqual(chunks.map((chunk) => chunk.length), [250, 250, 1]);
  assert.deepEqual(chunks.flat(), rows);
});

test("rejects invalid chunk sizes", () => {
  assert.throws(() => chunkRows([1], 0), RangeError);
  assert.throws(() => chunkRows([1], -1), RangeError);
  assert.throws(() => chunkRows([1], 1.5), RangeError);
});

test("supports a one-row batch size", () => {
  assert.deepEqual(chunkRows(["a", "b", "c"], 1), [["a"], ["b"], ["c"]]);
});

test("uses the default chunk size when splitting a full-size workload", () => {
  const rows = Array.from({ length: 501 }, (_, index) => index);
  assert.deepEqual(chunkRows(rows).map((chunk) => chunk.length), [250, 250, 1]);
});
