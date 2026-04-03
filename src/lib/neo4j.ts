import neo4j, { type Driver } from "neo4j-driver";

let driver: Driver | null = null;

type Neo4jConfig = {
  uri: string;
  username: string;
  password: string;
};

function getConfig(): Neo4jConfig | null {
  const uri = process.env.NEO4J_URI?.trim();
  const username = process.env.NEO4J_USERNAME?.trim();
  const password = process.env.NEO4J_PASSWORD?.trim();

  if (!uri || !username || !password) {
    return null;
  }

  return { uri, username, password };
}

export function hasNeo4jConfig() {
  return Boolean(getConfig());
}

export function getDriver() {
  const config = getConfig();

  if (!config) {
    return null;
  }

  if (!driver) {
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    );
  }

  return driver;
}
