const app = require('./app');
const config = require('./config');
const { testDatabaseConnection } = require('./config/database.config');
const dataforgeConfig = require('./config/dataforge.config');
const ConversionService = require('./services/conversion.service');

async function start() {
  await testDatabaseConnection();

  app.listen(config.app.port, () => {
    console.log(`[app] ${config.app.name} running on port ${config.app.port}`);
    console.log(`[app] slug: ${config.app.slug}`);
    console.log(`[app] env: ${config.app.env}`);

    const recoveryDelayMs = Math.max(0, Number(dataforgeConfig.pdf.startupRecoveryDelayMs || 0));
    console.log(`[conversion] PDF startup recovery scheduled in ${recoveryDelayMs}ms`);

    setTimeout(() => {
      ConversionService.recoverInterruptedPdfConversions()
        .then((result) => {
          if (result.total > 0) {
            console.log(
              `[conversion] PDF startup recovery: queued=${result.queued}, paused=${result.paused}, failed=${result.failed}, worker_concurrency=1`
            );
          }
        })
        .catch((error) => {
          console.error('[conversion] PDF startup recovery failed:', error);
        });
    }, recoveryDelayMs);
  });
}

start().catch((err) => {
  console.error('[startup] failed:', err);
  process.exit(1);
});
