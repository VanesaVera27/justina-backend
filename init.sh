#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno (stack Node + Express)
#
# Este script lo ejecuta el agente al COMENZAR una sesión y antes de
# declarar cualquier tarea como `done`. Si falla, la sesión no debe avanzar.
#
# Salida esperada: códigos de salida claros y bloques marcados con [OK]/[FAIL].

set -u
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

EXIT_CODE=0

echo "── 1. Verificando entorno ─────────────────────────────"

if ! command -v node >/dev/null 2>&1; then
  fail "node no está instalado"
  exit 1
fi
ok "node -> $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm no está instalado"
  exit 1
fi
ok "npm -> $(npm --version)"

# Versión mínima Node >= 20 (Express 5 y node --watch)
NODE_MAJOR=$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Se requiere Node >= 20 (se detectó $NODE_MAJOR)"
  exit 1
fi
ok "Versión de Node compatible"

echo ""
echo "── 2. Verificando archivos y carpetas base ─────────────"

for f in AGENTS.md feature_list.json progress/current.md package.json scripts/smoke.js docs/arquitectura.md docs/estructura.md docs/convenciones.md docs/http.md docs/verificacion.md CHECKPOINTS.md; do
  if [ ! -f "$f" ]; then
    fail "Falta archivo base: $f"
    EXIT_CODE=1
  else
    ok "Existe $f"
  fi
done

for d in src/domain src/repositories src/services src/controllers src/routes src/middlewares; do
  if [ ! -d "$d" ]; then
    fail "Falta carpeta de capa: $d"
    EXIT_CODE=1
  else
    ok "Existe $d/"
  fi
done

echo ""
echo "── 3. Validando feature_list.json (tareas) ──────────"

node - <<'NODE'
const fs = require("fs");
try {
  const data = JSON.parse(fs.readFileSync("feature_list.json", "utf8"));
  const validStatus = new Set(["pending", "in_progress", "done", "blocked"]);
  const tareas = data.tareas || [];
  const errors = [];
  const nombres = new Set();

  if (tareas.filter((t) => t.status === "in_progress").length > 1) {
    errors.push("Hay más de 1 tarea en in_progress (máximo 1)");
  }

  for (const t of tareas) {
    if (!validStatus.has(t.status)) {
      errors.push(`Estado inválido en tarea ${t.name}: ${t.status}`);
    }
    if (nombres.has(t.name)) {
      errors.push(`Nombre de tarea duplicado: ${t.name}`);
    }
    nombres.add(t.name);
  }

  if (errors.length > 0) {
    for (const e of errors) console.log(`[FAIL]  ${e}`);
    process.exit(1);
  }
  console.log(`[OK]    feature_list.json válido (${tareas.length} tareas)`);
} catch (e) {
  console.log(`[FAIL]  feature_list.json inválido: ${e.message}`);
  process.exit(1);
}
NODE

if [ $? -ne 0 ]; then EXIT_CODE=1; fi

echo ""
echo "── 4. Instalando dependencias (si falta express) ───────"

if [ ! -d node_modules/express ]; then
  warn "Dependencias ausentes, ejecutando npm install..."
  if npm install --silent 2>&1; then
    ok "Dependencias instaladas"
  else
    fail "npm install falló"
    EXIT_CODE=1
  fi
else
  ok "Dependencias presentes"
fi

echo ""
echo "── 5. Lint (oxlint) ────────────────────────────────────"

if [ -f package.json ]; then
  if npm run lint 2>&1; then
    ok "Lint sin errores"
  else
    fail "El lint encontró errores"
    EXIT_CODE=1
  fi
else
  warn "No hay package.json todavía"
fi

echo ""
echo "── 6. Smoke (API real) ─────────────────────────────────"

if [ -f package.json ]; then
  if npm run smoke 2>&1; then
    ok "Smoke correcto"
  else
    fail "El smoke falló"
    EXIT_CODE=1
  fi
else
  warn "No hay package.json todavía"
fi

echo ""
echo "── 7. Resumen ──────────────────────────────────────────"

if [ $EXIT_CODE -eq 0 ]; then
  ok "Entorno listo. Puedes empezar a trabajar."
else
  fail "Entorno NO está listo. Resuelve los errores antes de avanzar."
fi

exit $EXIT_CODE
