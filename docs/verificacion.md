# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.
> Toda tarea termina con evidencia ejecutable, no con afirmaciones.
>
> Este proyecto **no usa un framework de tests**. La red de seguridad es el
> **lint**, el **smoke ejecutable** (`scripts/smoke.js`) y, cuando aporta, un
> **smoke manual** con `curl`.

## Niveles de verificación

### Nivel 1 — Lint (obligatorio)

```bash
npm run lint        # oxlint src scripts
```

Debe terminar sin errores.

### Nivel 2 — Smoke ejecutable (obligatorio)

```bash
npm run smoke       # node scripts/smoke.js
```

El script:

1. En la plantilla vacía no hay nada que verificar: termina con
   `[OK] smoke: plantilla sin endpoints, nada que verificar`.
2. Cada tarea que agrega o cambia un endpoint lo extiende (véase la
   estructura sugerida dentro del propio script).

**Cada tarea que agrega o cambia un endpoint debe extender
`scripts/smoke.js`** con la comprobación del caso nuevo (status,
`Content-Type`, body y un caso de error). No se agregan frameworks de tests:
el smoke es un script Node sin dependencias.

### Nivel 3 — Smoke manual (recomendado para endpoints nuevos)

Ejecuta la API real y prueba el flujo a mano:

```bash
npm run dev
curl -i http://localhost:3000/<recurso>
curl -i http://localhost:3000/ruta-inexistente
```

Reporta en tu resumen **qué** comprobaste y **qué** viste (no escribís
archivos; el `implementer` no documenta).

## Anti-patrones (no hacer)

- ❌ "He añadido el endpoint, debería funcionar." → falta evidencia.
- ❌ Declarar `done` sin pasar `./init.sh`.
- ❌ Agregar un endpoint sin extender `scripts/smoke.js`.
- ❌ Describir un cambio sin decir cómo se comprobó.
- ❌ Introducir `console.log` de debug "para ver si anda".
- ❌ Agregar Vitest, Jest, Mocha o similares.

## Verificación final antes de cerrar

```bash
./init.sh           # debe terminar con [OK] Entorno listo
```

Si `./init.sh` está rojo, **no** marques nada como `done`. Anota el bloqueo
en `progress/current.md` y deja la tarea con estado `blocked` en
`feature_list.json`.
