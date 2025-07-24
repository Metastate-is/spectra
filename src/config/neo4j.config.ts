import { registerAs } from "@nestjs/config";

/**
 * Конфигурация Neo4j
 *
 * @property url - URL подключения к Neo4j
 * @property user - Пользователь Neo4j
 * @property password - Пароль Neo4j
 */
export default registerAs("neo4j", () => ({
  url: process.env.NEO4_URL,
  user: process.env.NEO4J_USER || "neo4j",
  password: process.env.NEO4J_PASSWORD || "55135513",
}));
