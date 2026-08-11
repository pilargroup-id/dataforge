const express = require('express');
const cors = require('cors');

const config = require('./config');
const routes = require('./routes');
const R = require('./utils/response.util');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

app.disable('x-powered-by');

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  return R.ok(res, {
    app: config.app.name,
    slug: config.app.slug,
    environment: config.app.env,
  }, 'Healthy');
});

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
