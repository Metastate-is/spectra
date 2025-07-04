import { Neo4jService } from "../neo4j/neo4j.service";
import { StructuredLoggerService } from "../logger";
import { TransactionPromise } from 'neo4j-driver-core';
import { IBaseMark } from "../iterface/base.interface";

/**
 * Модель данных в Neo4j
 * 
 * Сущности:
 * 
 * Label: Participant - участник системы
 * Props:
 * - participantId: string (уникальный ID пользователя)
 * 
 * Label: Mark - сама оценка/связь между участниками
 * Props:
 * - id: string (уникальный ID связи)
 * - value: boolean (например, "нравится" / "не нравится")
 * - createdAt: datetime (дата создания)
 * - updatedAt: datetime (дата обновления)
 * 
 * Label: MarkType — тип связи (например, "TrustMark", "BusinessFeedback", "RelationMark")
 * Props:
 * - name: string (уникальное имя типа, enum-подобный ключ)
 * - onchain: boolean (true если onchain-марка, false — offchain)
 * 
 * Связи между сущностями:
 * 
 * (:Participant {participantId: "A"}) 
 *   -[:GAVE]-> 
 *     (:Mark {value: true}) 
 *       -[:ABOUT]-> (:Participant {participantId: "B"})
 * 
 * (:Mark) -[:OF_TYPE]-> (:MarkType {name: "TrustMark", onchain: true})
 * 
 * То есть граф связи:
 * 
 * (from:Participant)-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant)
 *                               |
 *                               [:OF_TYPE]
 *                               ↓
 *                               (type:MarkType)
 * 
 * Правила создания/обновления связи:
 * 
 * 1. Убедиться, что оба Participant существуют (MERGE по id)
 * 2. Убедиться, что нужный MarkType существует (MERGE по name + onchain)
 * 3. Проверить, есть ли уже Mark между этими участниками с таким MarkType
 * 4. Если есть — обновить value и updatedAt
 * 5. Если нет — создать новую Mark и все нужные отношения (GAVE, ABOUT, OF_TYPE)
 * 
 */

export abstract class BaseMarkService<TMark extends IBaseMark> {
  protected abstract readonly onchain: boolean;
  protected readonly logger = new StructuredLoggerService();

  protected abstract create(mark: TMark, tx: TransactionPromise): Promise<void>;
  protected abstract update(mark: TMark, tx: TransactionPromise): Promise<void>;

  constructor(protected readonly neo4jService: Neo4jService, contextName: string) {
    this.logger.setContext(contextName);
  }

  /**
   * Главный метод для обработки всех отметок
   * @param mark 
   */
  protected async process(mark: TMark): Promise<boolean> {
    const session = this.neo4jService.initSession();
    const tx = session.beginTransaction();

    const queryParams = {
      ...mark,
      tx
    }

    try {
      await this.createParticipantIfNotExists(mark.fromParticipantId, tx);
      await this.createParticipantIfNotExists(mark.toParticipantId, tx);

      const existing = await this.findOne(mark, tx);

      if (existing) {
        await this.update(queryParams, tx);
      } else {
        await this.create(queryParams, tx);
      }

      await tx.commit();
      return true;
    } catch (e) {
      this.logger.error('Error creating/updating mark', e);
      await tx.rollback();
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Создание участника, если он не существует
   * @param participantId 
   */
  protected async createParticipantIfNotExists(participantId: string, tx: TransactionPromise): Promise<void> {
    await tx.run(/*cypher*/`MERGE (:Participant {participantId: $participantId})`, { participantId });
  }

  /**
   * Получение существующей отметки
   * @param mark 
   */
  protected async findOne(mark: TMark, tx: TransactionPromise): Promise<Record<string, any> | null> {
    const result = await tx.run(/*cypher*/`
      MATCH (from:Participant {participantId: $fromParticipantId})-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant {participantId: $toParticipantId}),
            (mark)-[:OF_TYPE]->(type:MarkType {name: $markType, onchain: $onchain})
      RETURN mark
      `,
      { ...mark, onchain: this.onchain }
    );
    return result.records.length ? result.records[0].get('mark').properties : null;
  }
}
