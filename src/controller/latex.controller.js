const logger = require('../config/logger.config');
const latexService = require('../service/latex.service');

class LatexController {
  async compile(req, res) {
    const { tex } = req.body || {};

    if (typeof tex !== 'string' || tex.trim().length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing 'tex' source in request body." });
    }

    if (tex.length > 2_000_000) {
      return res.status(413).json({ ok: false, error: 'Document too large.' });
    }

    try {
      logger.info('request reached handler');
      const result = await latexService.compileLatex(tex);
      logger.info('request sent to service');
      if (result.success) {
        res.setHeader('Content-Type', 'application/pdf');
        logger.info('Sucessfully sent response ack from controler');
        return res.send(result.pdfBuffer);
      } else {
        logger.error('invalid respone from controleer');
        return res.status(422).json({
          ok: false,
          log: result.log,
          errors: result.errors,
        });
      }
    } catch (err) {
      console.error('Compilation error:', err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
}

module.exports = new LatexController();
