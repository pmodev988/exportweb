#!/usr/bin/env bash
set -euo pipefail
root="$(cd -- "$(dirname -- "$0")/../.." && pwd -P)"
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 24 ]] || { echo "Node 24 required" >&2; exit 1; }
java -version 2>&1 | head -1 | grep -Eq '"25[.+"]' || { echo "Java 25 required" >&2; exit 1; }
for target in "$root/05_code/exportweb-api/target" "$root/21_client/exportweb-web"; do
 [[ ! -L "$target" ]] || { echo "Build target must not be a link" >&2; exit 1; }
done
cd "$root/05_code/exportweb-web"
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
cd "$root/05_code/exportweb-api"
mvn -B -ntp clean package -DskipTests
cp target/exportweb-api-0.1.0.jar "$root/21_client/exportweb-api-0.1.0.jar"
sha256sum "$root/21_client/exportweb-api-0.1.0.jar"
echo "Run PostgreSQL integration tests separately before submitting a release."
