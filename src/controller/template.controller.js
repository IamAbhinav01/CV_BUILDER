const fs = require('fs/promises');
const path = require('path');

class TemplateController {
  async listTemplates(req, res) {
    try {
      const templatesDir = path.join(__dirname, '../templates');
      const files = await fs.readdir(templatesDir, { withFileTypes: true });
      const templates = files
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      return res.json({ success: true, templates });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTemplateFiles(req, res) {
    try {
      const { id } = req.params;
      const templatePath = path.join(__dirname, '../templates', id);
      
      // Basic security check against traversal
      if (id.includes('..') || path.isAbsolute(id)) {
        return res.status(400).json({ success: false, error: 'Invalid template ID' });
      }

      // Check if template exists
      try {
        await fs.access(templatePath);
      } catch {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      // Recursively read all .tex files for the LLM to edit
      const getFiles = async (dir, base = '') => {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        let results = {};
        for (const dirent of dirents) {
          const resPath = path.join(dir, dirent.name);
          const relPath = path.join(base, dirent.name).replace(/\\/g, '/');
          
          if (dirent.isDirectory()) {
            results = { ...results, ...(await getFiles(resPath, relPath)) };
          } else if (dirent.name.endsWith('.tex')) {
            const content = await fs.readFile(resPath, 'utf8');
            results[relPath] = content;
          }
        }
        return results;
      };

      const files = await getFiles(templatePath);
      
      return res.json({ success: true, files });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new TemplateController();
