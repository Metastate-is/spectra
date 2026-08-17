import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { ExportPostgresCommand } from "./export-postgres.command";

function record(values: Record<string, unknown>) {
  return { get: (key: string) => values[key] };
}

describe("ExportPostgresCommand", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "spectra-postgres-export-"));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("exports marks/history with a verifiable checksum and restricted permissions", async () => {
    const neo4jService = {
      runQuery: jest
        .fn()
        .mockResolvedValueOnce({
          records: [
            record({
              id: "mark-id",
              fromParticipantId: "from-id",
              toParticipantId: "to-id",
              isOnchain: false,
              markTypeName: "BusinessFeedback",
              value: true,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
            }),
          ],
        })
        .mockResolvedValueOnce({
          records: [
            record({
              id: "history-id",
              fromParticipantId: "from-id",
              toParticipantId: "to-id",
              isOnchain: true,
              markTypeName: "TrustMark",
              value: false,
              createdAt: "2026-01-03T00:00:00.000Z",
            }),
          ],
        }),
    } as unknown as Neo4jService;
    const output = join(temporaryDirectory, "nested", "export.json");
    const command = new ExportPostgresCommand(neo4jService);

    await command.run([], { output });

    const parsed = JSON.parse(await readFile(output, "utf8"));
    const { checksum, ...data } = parsed;
    expect(checksum).toEqual({
      algorithm: "sha256",
      value: createHash("sha256").update(JSON.stringify(data)).digest("hex"),
    });
    expect(data.marks).toEqual([
      expect.objectContaining({ markType: 2, isOnchain: false, value: true }),
    ]);
    expect(data.history).toEqual([
      expect.objectContaining({ markType: 1, isOnchain: true, value: false }),
    ]);
    expect((await stat(output)).mode & 0o777).toBe(0o600);
  });
});
