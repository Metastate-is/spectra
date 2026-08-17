import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Command, CommandRunner, Option } from "nest-commander";
import { StructuredLoggerService } from "src/core/logger";
import { Neo4jService } from "src/core/neo4j/neo4j.service";

interface ExportOptions {
  output?: string;
}

interface ExportedMark {
  createdAt: string;
  fromParticipantId: string;
  id: string;
  isOnchain: boolean;
  markType: number;
  toParticipantId: string;
  updatedAt: string;
  value: boolean;
}

interface ExportedHistory {
  createdAt: string;
  fromParticipantId: string;
  id: string;
  isOnchain: boolean;
  markType: number;
  toParticipantId: string;
  value: boolean;
}

@Command({
  name: "export-postgres",
  description: "Export Spectra Neo4j marks and changelog for Citadel PostgreSQL import",
})
export class ExportPostgresCommand extends CommandRunner {
  private readonly logger = new StructuredLoggerService();

  constructor(private readonly neo4jService: Neo4jService) {
    super();
    this.logger.setContext(ExportPostgresCommand.name);
  }

  async run(_passedParams: string[], options?: ExportOptions): Promise<void> {
    if (!options?.output) {
      throw new Error("--output is required");
    }

    const outputPath = resolve(options.output);
    const marks = await this.exportMarks();
    const history = await this.exportHistory();
    const data = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      marks,
      history,
    };
    const checksum = createHash("sha256").update(JSON.stringify(data)).digest("hex");

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify({ ...data, checksum: { algorithm: "sha256", value: checksum } })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );

    this.logger.log("Spectra export completed", {
      meta: { outputPath, marks: marks.length, history: history.length, checksum },
    });
  }

  @Option({ flags: "-o, --output <path>", description: "Destination JSON file" })
  parseOutput(value: string): string {
    return value;
  }

  private async exportMarks(): Promise<ExportedMark[]> {
    const result = await this.neo4jService.runQuery(`
      MATCH (from:Participant)-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant),
            (mark)-[:OF_TYPE]->(type:MarkType)
      RETURN mark.id AS id,
             from.participantId AS fromParticipantId,
             to.participantId AS toParticipantId,
             type.onchain AS isOnchain,
             type.name AS markTypeName,
             mark.value AS value,
             mark.createdAt AS createdAt,
             mark.updatedAt AS updatedAt
      ORDER BY mark.updatedAt ASC, mark.id ASC
    `);

    return result.records.map((record) => ({
      id: this.requiredString(record.get("id"), "mark.id"),
      fromParticipantId: this.requiredString(record.get("fromParticipantId"), "fromParticipantId"),
      toParticipantId: this.requiredString(record.get("toParticipantId"), "toParticipantId"),
      isOnchain: Boolean(record.get("isOnchain")),
      markType: this.mapMarkType(Boolean(record.get("isOnchain")), record.get("markTypeName")),
      value: Boolean(record.get("value")),
      createdAt: this.toIso(record.get("createdAt"), "mark.createdAt"),
      updatedAt: this.toIso(record.get("updatedAt"), "mark.updatedAt"),
    }));
  }

  private async exportHistory(): Promise<ExportedHistory[]> {
    const result = await this.neo4jService.runQuery(`
      MATCH (from:Participant)-[:MADE_CHANGELOG]->(change:Changelog)-[:APPLIES_TO]->(to:Participant),
            (change)-[:OF_TYPE]->(type:MarkType)
      RETURN change.id AS id,
             from.participantId AS fromParticipantId,
             to.participantId AS toParticipantId,
             type.onchain AS isOnchain,
             type.name AS markTypeName,
             change.value AS value,
             change.createdAt AS createdAt
      ORDER BY change.createdAt ASC, change.id ASC
    `);

    return result.records.map((record) => ({
      id: this.requiredString(record.get("id"), "change.id"),
      fromParticipantId: this.requiredString(record.get("fromParticipantId"), "fromParticipantId"),
      toParticipantId: this.requiredString(record.get("toParticipantId"), "toParticipantId"),
      isOnchain: Boolean(record.get("isOnchain")),
      markType: this.mapMarkType(Boolean(record.get("isOnchain")), record.get("markTypeName")),
      value: Boolean(record.get("value")),
      createdAt: this.toIso(record.get("createdAt"), "change.createdAt"),
    }));
  }

  private mapMarkType(isOnchain: boolean, value: unknown): number {
    if (isOnchain && value === "TrustMark") return 1;
    if (!isOnchain && value === "RelationMark") return 1;
    if (!isOnchain && value === "BusinessFeedback") return 2;
    throw new Error(`Unsupported Spectra mark type: ${String(value)}`);
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Spectra export field ${field} is missing`);
    }
    return value;
  }

  private toIso(value: unknown, field: string): string {
    const standardDate =
      value && typeof value === "object" && "toStandardDate" in value
        ? (value as { toStandardDate: () => Date }).toStandardDate()
        : new Date(value as string | number | Date);

    if (!Number.isFinite(standardDate.getTime())) {
      throw new Error(`Spectra export field ${field} is not a valid datetime`);
    }
    return standardDate.toISOString();
  }
}
