import { TransactionPromise } from "neo4j-driver-core";
import { cypher } from "src/utils/cypher";
import { IBaseMark } from "../iterface/base.interface";
import { StructuredLoggerService } from "../logger";
import { Neo4jService } from "../neo4j/neo4j.service";
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

export interface IGetMutualMarksResult {
  fromTo: boolean | null;
  toToFrom: boolean | null;
}

export interface IGetReputationContextResponse extends IGetMutualMarksResult {
  commonParticipants: CommonParticipant[];
}

export interface CommonParticipant {
  intermediateId: string;
  intermediateToFrom: boolean | null;
  fromToIntermediate: boolean | null;
  intermediateToTo: boolean | null;
  toToIntermediate: boolean | null;
}

export interface IGetReputationCountResponse {
  positive: number;
  negative: number;
  commonCount: number;
}

export interface IGetReputationChangelogResponse {
  updatedAt: string;
  value: boolean;
  participantId: string;
}

export abstract class BaseMarkService<TMark extends IBaseMark> {
  protected abstract readonly onchain: boolean;
  protected readonly logger = new StructuredLoggerService();

  protected abstract create(mark: TMark, tx: TransactionPromise): Promise<TMark>;
  protected abstract update(mark: TMark, tx: TransactionPromise): Promise<TMark>;
  protected abstract sendEventCreateMark(mark: TMark, e?: Error): Promise<void>;

  constructor(
    protected readonly neo4jService: Neo4jService,
    contextName: string,
  ) {
    this.logger.setContext(contextName);
  }

  /**
   * Главный метод для обработки всех отметок
   * @param mark
   */
  protected async process(mark: TMark): Promise<boolean> {
    const session = this.neo4jService.initSession();
    const tx = session.beginTransaction();

    let upsertedMark: TMark | null = null;

    try {
      await this.createParticipantIfNotExists(mark.fromParticipantId, tx);
      await this.createParticipantIfNotExists(mark.toParticipantId, tx);

      const existing = await this.findOne(mark, tx);
      
      // Пишем Changelog в любом случае
      await tx.run(this.getReputationChangelogQuery(), {
        fromId: mark.fromParticipantId,
        toId: mark.toParticipantId,
        value: mark.value,
        markType: mark.markType,
        onchain: this.onchain,
      });
      
      if (existing) {
        upsertedMark = await this.update(mark, tx);
        await tx.commit();
      } else {
        upsertedMark = await this.create(mark, tx);
        await tx.commit();
      }
      await this.sendEventCreateMark(upsertedMark);

      return true;
    } catch (e) {
      this.logger.error("Error creating/updating mark", e);
      await tx.rollback();

      await this.sendEventCreateMark(mark, e);

      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Создание участника, если он не существует
   * @param participantId
   */
  protected async createParticipantIfNotExists(
    participantId: string,
    tx: TransactionPromise,
  ): Promise<void> {
    const query = cypher /*cypher*/`MERGE (:Participant {participantId: $participantId})`;
    await tx.run(query, {
      participantId,
    });
  }

  /**
   * Получение существующей отметки
   * @param mark
   */
  protected async findOne(
    mark: TMark,
    tx: TransactionPromise,
  ): Promise<Record<string, any> | null> {
    const query = cypher /*cypher*/`
    MATCH (from:Participant {participantId: $fromParticipantId})-[:GAVE]->(mark:Mark)-[:ABOUT]->(to:Participant {participantId: $toParticipantId}),
          (mark)-[:OF_TYPE]->(type:MarkType {name: $markType, onchain: $onchain})
    RETURN mark
    `;

    const result = await tx.run(query, { ...mark, onchain: this.onchain });
    return result.records.length ? result.records[0].get("mark").properties : null;
  }

  /**
   * Получает список общих участников (intermediate), которые имеют связь с двумя пользователями —
   * userA и userB — через оценки типа "BusinessFeedback" (offchain).
   *
   * Для каждого найденного участника возвращаются значения направленных оценок:
   * - как intermediate относится к userA (intermediate → userA)
   * - как userA относится к intermediate (userA → intermediate)
   * - как intermediate относится к userB (intermediate → userB)
   * - как userB относится к intermediate (userB → intermediate)
   *
   * Условия:
   * - intermediate не должен быть самим userA или userB.
   * - оценки учитываются только с типом MarkType { name: "BusinessFeedback", onchain: false }.
   * - связи между участниками и Mark'ами могут быть как GAVE, так и ABOUT.
   *
   * Возвращаемые поля:
   * {
   *   intermediateId: string;             // ID общего участника
   *   intermediateToUserA: boolean | null;  // оценка intermediate → userA (если есть)
   *   userAToIntermediate: boolean | null;  // оценка userA → intermediate (если есть)
   *   intermediateToUserB: boolean | null;  // оценка intermediate → userB (если есть)
   *   userBToIntermediate: boolean | null;  // оценка userB → intermediate (если есть)
   * }
   *
   * Использование:
   * - Применяется для анализа "социального графа доверия" между двумя пользователями.
   * - Может использоваться для определения репутационного контекста или рекомендаций.
   */
  protected async findCommonParticipants(mark: TMark): Promise<CommonParticipant[]> {
    const query = cypher /* cypher */`
      MATCH (type:MarkType {name: $markType, onchain: $onchain})
  
      // Все участники, связанные с userA
      MATCH (intermediate:Participant)
      WHERE intermediate.participantId <> $userA AND intermediate.participantId <> $userB
  
      OPTIONAL MATCH (intermediate)-[:GAVE]->(m1:Mark)-[:ABOUT]->(a1:Participant {participantId: $userA})
      WHERE (m1)-[:OF_TYPE]->(type)
  
      OPTIONAL MATCH (a2:Participant {participantId: $userA})-[:GAVE]->(m2:Mark)-[:ABOUT]->(intermediate)
      WHERE (m2)-[:OF_TYPE]->(type)
  
      OPTIONAL MATCH (intermediate)-[:GAVE]->(m3:Mark)-[:ABOUT]->(b1:Participant {participantId: $userB})
      WHERE (m3)-[:OF_TYPE]->(type)
  
      OPTIONAL MATCH (b2:Participant {participantId: $userB})-[:GAVE]->(m4:Mark)-[:ABOUT]->(intermediate)
      WHERE (m4)-[:OF_TYPE]->(type)
  
      WITH intermediate,
           m1.value AS intermediateToUserA,
           m2.value AS userAToIntermediate,
           m3.value AS intermediateToUserB,
           m4.value AS userBToIntermediate
  
      WHERE (intermediateToUserA IS NOT NULL OR userAToIntermediate IS NOT NULL)
        AND (intermediateToUserB IS NOT NULL OR userBToIntermediate IS NOT NULL)
  
      RETURN
        intermediate.participantId AS intermediateId,
        intermediateToUserA,
        userAToIntermediate,
        intermediateToUserB,
        userBToIntermediate
    `;

    try {
      const result = await this.neo4jService.runQuery(query, {
        userA: mark.fromParticipantId,
        userB: mark.toParticipantId,
        onchain: this.onchain,
        markType: mark.markType,
      });

      return result.records.map((r) => ({
        intermediateId: r.get("intermediateId"),
        intermediateToFrom: r.get("intermediateToUserA"),
        fromToIntermediate: r.get("userAToIntermediate"),
        intermediateToTo: r.get("intermediateToUserB"),
        toToIntermediate: r.get("userBToIntermediate"),
      }));
    } catch (e) {
      this.logger.error("Failed to find common BusinessFeedback participants", e);
      return [];
    }
  }

  /**
   * Получает оценки типа "BusinessFeedback" (offchain) между двумя участниками:
   * - от userA к userB
   * - от userB к userA
   *
   * Условия:
   * - учитываются только оценки с типом MarkType { name: "BusinessFeedback", onchain: false }
   * - если оценка отсутствует — возвращается null
   *
   * Возвращаемые поля:
   * {
   *   userAToUserB: boolean | null;  // оценка userA → userB (если есть)
   *   userBToUserA: boolean | null;  // оценка userB → userA (если есть)
   * }
   *
   * Использование:
   * - анализ направленных отношений между двумя участниками в социальном графе
   * - получение контекста доверия или репутации между ними
   */
  protected async findMutualMarks(mark: TMark): Promise<IGetMutualMarksResult> {
    const query = cypher /* cypher */`
      MATCH (type:MarkType {name: $markType, onchain: $onchain})

      OPTIONAL MATCH (fromA:Participant {participantId: $userA})-[:GAVE]->(markA:Mark)-[:ABOUT]->(toA:Participant {participantId: $userB}),
      (markA)-[:OF_TYPE]->(type)

      OPTIONAL MATCH (fromB:Participant {participantId: $userB})-[:GAVE]->(markB:Mark)-[:ABOUT]->(toB:Participant {participantId: $userA}),
      (markB)-[:OF_TYPE]->(type)

      RETURN
        markA.value AS fromTo,
        markB.value AS toToFrom
    `;

    try {
      const result = await this.neo4jService.runQuery(query, {
        userA: mark.fromParticipantId,
        userB: mark.toParticipantId,
        onchain: this.onchain,
        markType: mark.markType,
      });

      if (result.records.length === 0) {
        return { fromTo: null, toToFrom: null };
      }

      const record = result.records[0];
      return {
        fromTo: record.get("fromTo"),
        toToFrom: record.get("toToFrom"),
      };
    } catch (e) {
      this.logger.error("Failed to find mutual BusinessFeedback marks", e);
      return { fromTo: null, toToFrom: null };
    }
  }

  /**
   * Получает контекст доверия между двумя участниками
   * @param mark
   * @returns
   */
  protected async getReputationContext(mark: TMark): Promise<IGetReputationContextResponse> {
    try {
      const mutualMarks = await this.findMutualMarks(mark);
      const commonParticipants = await this.findCommonParticipants(mark);
      return {
        ...mutualMarks,
        commonParticipants,
      };
    } catch (e) {
      this.logger.error("Failed to get reputation context", e);
      return {
        fromTo: null,
        toToFrom: null,
        commonParticipants: [],
      };
    }
  }

  /**
   * Получает количество положительных (`value = true`) и отрицательных (`value = false`) оценок,
   *      * Получает оценки типа "BusinessFeedback" (offchain) между двумя участниками:
     * - от userA к userB
     * - от userB к userA
     *
     * Пример
    * user1 -> user2 
    * 
    * Мы должны найти между ними пользователя 
    * Между ними пользователей должно быть 0
    * 
    * user2 -> user3
    * user1 -> user4
    * 
    * Между ними пользователей должно быть user5
    * user5 -> user1
    * user5 -> user2
    * 
    * Между ними пользователей должно быть user5 и user6
    * user1 -> user6
    * user2 -> user6  
    * 
    * Независит какое значение true или false 
    * Нужно найти само наличие связи
   */
  protected async getReputationCount(mark: TMark): Promise<IGetReputationCountResponse> {
    try{
      const commonParticipants = await this.findCommonParticipants(mark);
      const positive = commonParticipants.filter((p) => p.intermediateToTo === true).length;
      const negative = commonParticipants.filter((p) => p.intermediateToTo === false).length;
      const commonCount = commonParticipants.length;
      
      return {
        positive,
        negative,
        commonCount,
      };
    } catch (e) {
      this.logger.error("Failed to get reputation count", e);
      return { positive: 0, negative: 0, commonCount: 0 };
    }
  }

  /**
   * Пишем Changelog для любой операции
   * @param mark 
   * @returns 
   */
  private getReputationChangelogQuery(): string {
    return cypher /* cypher */`
      MATCH (from:Participant {participantId: $fromId})
      MATCH (to:Participant {participantId: $toId})
      MATCH (type:MarkType {name: $markType, onchain: $onchain})

      CREATE (cl:Changelog {
        id: randomUUID(),
        value: $value,
        createdAt: datetime()
      })
      MERGE (from)-[:MADE_CHANGELOG]->(cl)
      MERGE (cl)-[:APPLIES_TO]->(to)
      MERGE (cl)-[:OF_TYPE]->(type)
    `;
  }

   /**
     * Извлекает историю изменения "репутации" (changelog) между двумя участниками.
     *
     * Логика:
     * - Ищем все узлы `Changelog`, созданные пользователем `from` (MADE_CHANGELOG).
     * - Проверяем, что эти изменения относятся к пользователю `to` (APPLIES_TO).
     * - Ограничиваем только теми `Changelog`, которые связаны с конкретным типом оценки (`MarkType`).
     * - Возвращаем список изменений в порядке возрастания времени.
     *
     * Cypher-запрос:
     * ```cypher
     * MATCH (from:Participant {participantId: $userA})-[:MADE_CHANGELOG]->(cl:Changelog)
     * MATCH (cl)-[:APPLIES_TO]->(to:Participant {participantId: $userB})
     * MATCH (cl)-[:OF_TYPE]->(type:MarkType {name: $markType, onchain: $onchain})
     * RETURN cl.createdAt AS createdAt,
     *        cl.value AS value,
     *        from.participantId AS participantId,
     *        type.onchain AS onchain
     * ORDER BY cl.createdAt ASC
     * ```
     *
     * @param mark Объект `TMark`, содержащий информацию о:
     *  - `fromParticipantId` — кто оставил метку
     *  - `toParticipantId` — кому она оставлена
     *  - `markType` — тип метки (например, "RelationMark", "TrustMark")
     * @returns Массив объектов с историей изменений:
     *  - `updatedAt` — время создания изменения
     *  - `value` — значение (true/false или др.)
     *  - `participantId` — идентификатор того, кто оставил изменение
  */
  protected async getReputationChangelog(mark: TMark): Promise<IGetReputationChangelogResponse[]> {
    try {
      const query = cypher /* cypher */`
        MATCH (from:Participant {participantId: $userA})-[:MADE_CHANGELOG]->(cl:Changelog)
        MATCH (cl)-[:APPLIES_TO]->(to:Participant {participantId: $userB})
        MATCH (cl)-[:OF_TYPE]->(type:MarkType {name: $markType, onchain: $onchain})
        RETURN cl.createdAt AS createdAt,
          cl.value AS value,
          from.participantId AS participantId,
          type.onchain AS onchain
        ORDER BY cl.createdAt ASC
      `;
  
      const result = await this.neo4jService.runQuery(query, {
        userA: mark.fromParticipantId,
        userB: mark.toParticipantId,
        onchain: this.onchain,
        markType: mark.markType,
      });

      console.log("result", result);
  
      return result.records.map((r) => ({
        updatedAt: r.get("createdAt").toString(),
        value: r.get("value"),
        participantId: r.get("participantId"),
      }));
    } catch (e) {
      this.logger.error("Failed to get reputation changelog", e);
      return [];
    }
  }
}
