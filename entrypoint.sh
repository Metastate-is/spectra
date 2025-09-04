#!/bin/sh
set -e

echo "Running Neo4j initialization..."
node dist/src/cli.js init-neo4j

echo "Starting application..."
exec node dist/src/main.js