const { randomUUID } = require('crypto');
const { mkdir, writeFile } = require('fs/promises');
const os = require('os');
const path = require('path');

class LatexService {
  async latexService(texPayload) {
    const jobID = randomUUID();
    const dir = path.join(os.tmpdir(), 'latex-jobs', jobID);

    await mkdir(dir, { recursive: true });

    try {
      await writeFile(path.join(dir, 'doc.tex'), texPayload, 'utf-8');
    } catch (err) {
      console.log('Error occured in service layer : ', err);
      return err;
    }
  }
}

module.exports = LatexService;
