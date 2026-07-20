const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const COMPILE_TIMEOUT_MS = 15000; // 15 seconds timeout
const MAX_LOG_CHARS = 20000;

function runLatexmk(dir) {
  return new Promise((resolve) => {
    const args = [
      '-pdf',
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-no-shell-escape',
      '-file-line-error',
      '-outdir=' + dir,
      'doc.tex',
    ];

    const child = spawn('latexmk', args, { cwd: dir });

    let stdout = '';
    let stderr = '';
    let killedForTimeout = false;

    const timer = setTimeout(() => {
      killedForTimeout = true;
      child.kill('SIGKILL');
    }, COMPILE_TIMEOUT_MS);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', async () => {
      clearTimeout(timer);
      const pdfPath = path.join(dir, 'doc.pdf');
      const pdfExists = await fs
        .access(pdfPath)
        .then(() => true)
        .catch(() => false);

      if (killedForTimeout) {
        resolve({ ok: false, log: 'Compilation timed out (possible infinite loop or very heavy document).' });
        return;
      }

      if (pdfExists) {
        resolve({ ok: true, pdfPath });
      } else {
        let log = '';
        try {
          log = await fs.readFile(path.join(dir, 'doc.log'), 'utf8');
        } catch {
          log = stdout + '\n' + stderr;
        }
        resolve({ ok: false, log: log.slice(-MAX_LOG_CHARS) });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, log: `Failed to start latexmk: ${err.message}` });
    });
  });
}

function extractErrors(log) {
  const lines = log.split('\n');
  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(.+?):(\d+):\s*(.+)$/);
    if (m) {
      errors.push({ file: m[1], line: Number(m[2]), message: m[3] });
      if (errors.length >= 10) break;
    }
  }
  return errors;
}

class LatexService {
  async compileLatex(texPayload) {
    const jobID = randomUUID();
    const dir = path.join(os.tmpdir(), 'latex-jobs', jobID);

    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.writeFile(path.join(dir, 'doc.tex'), texPayload, 'utf8');
      
      const compileResult = await runLatexmk(dir);
      
      if (compileResult.ok) {
        const pdfBuffer = await fs.readFile(compileResult.pdfPath);
        return { success: true, pdfBuffer };
      } else {
        const errors = extractErrors(compileResult.log);
        return { success: false, log: compileResult.log, errors };
      }
    } catch (err) {
      console.log('Error occured in service layer : ', err);
      throw new Error(err.message);
    } finally {
      // Best-effort cleanup
      fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

module.exports = new LatexService();
