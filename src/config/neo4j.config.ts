import { registerAs } from "@nestjs/config";

/**
 * Конфигурация Neo4j
 *
 * @property host - Хост Neo4j
 * @property port - Порт Neo4j
 * @property scheme - Схема Neo4j
 * @property user - Пользователь Neo4j
 * @property password - Пароль Neo4j
 */
export default registerAs("neo4j", () => ({
  host: process.env.NEO4J_HOST || "localhost",
  port: process.env.NEO4J_PORT || "7687",
  scheme: process.env.NEO4J_SCHEME || "bolt",
  user: process.env.NEO4J_USER || "neo4j",
  password: process.env.NEO4J_PASSWORD || "55135513",
}));
