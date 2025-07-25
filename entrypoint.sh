#!/bin/sh
set -e

echo "Running Neo4j initialization..."

node dist/cli.js init-neo4j

echo "Starting application..."

exec node dist/main.js