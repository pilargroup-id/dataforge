# Dataforge Backend Structure

Dataforge follows the shared `template-backend-express` entrypoints and auth implementation.

`src/app.js`, `src/server.js`, auth middleware/service/controller/routes, error middleware, response utility, and database bootstrap remain the shared template baseline. Domain functionality is added through new modules.

## Source folders

- `config/` — application and Dataforge-specific configuration.
- `constants/` — shared fixed values such as statuses and file formats.
- `controllers/` — HTTP request/response handlers.
- `converters/` — pluggable format conversion engines.
- `jobs/` — scheduled/startup cleanup jobs.
- `middleware/` — Dataforge-specific access, upload, and permission middleware in addition to template middleware.
- `models/` — MySQL query/data-access layer.
- `routes/` — API routing.
- `services/` — business orchestration.
- `transformers/` — reusable row/header/date/currency transformations across conversion or merge modules.
- `utils/` — shared helpers.
- `validators/` — schema and file validation.

There are intentionally no `repositories/`, `workers/`, `dataforge.app.js`, or `dataforge.server.js` layers in the MVP.
