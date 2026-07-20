const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/server.config');
const latexRouter = require('./router/latex.router');
const logger = require('./config/logger.config');

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/api', latexRouter);

app.listen(PORT, () => {
  logger.info(`server running on port : ${PORT}`);
});
