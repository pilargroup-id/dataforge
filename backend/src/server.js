const app = require('./app');
const config = require('./config');
const { testDatabaseConnection } = require('./config/database.config');

async function start() {
  await testDatabaseConnection();

  app.listen(config.app.port, () => {
    console.log(`[app] ${config.app.name} running on port ${config.app.port}`);
    console.log(`[app] slug: ${config.app.slug}`);
    console.log(`[app] env: ${config.app.env}`);
  });
}

start().catch((err) => {
  console.error('[startup] failed:', err);
  process.exit(1);
});
