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

  async getTemplateConcatenated(req, res) {
    try {
      const { id } = req.params;
      const templatePath = path.join(__dirname, '../templates', id);
      
      if (id.includes('..') || path.isAbsolute(id)) {
        return res.status(400).json({ success: false, error: 'Invalid template ID' });
      }

      try {
        await fs.access(templatePath);
      } catch {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      // 1. Find the main .tex file
      const dirents = await fs.readdir(templatePath, { withFileTypes: true });
      let mainTexPath = null;
      let mainContent = '';

      for (const dirent of dirents) {
        if (!dirent.isDirectory() && dirent.name.endsWith('.tex')) {
          const content = await fs.readFile(path.join(templatePath, dirent.name), 'utf8');
          if (content.includes('\\documentclass')) {
            mainTexPath = path.join(templatePath, dirent.name);
            mainContent = content;
            break;
          }
        }
      }

      if (!mainTexPath) {
        return res.status(404).json({ success: false, error: 'No main .tex file found for this template' });
      }

      // 2. Recursively resolve \input{} tags
      const resolveInputs = async (content, baseDir) => {
        const inputRegex = /\\input{([^}]+)}/g;
        let match;
        // Need to evaluate asynchronously so we extract matches first
        let matches = [];
        while ((match = inputRegex.exec(content)) !== null) {
          matches.push({ full: match[0], filename: match[1] });
        }

        let resolvedContent = content;
        for (const m of matches) {
          let inputFileName = m.filename;
          if (!inputFileName.endsWith('.tex')) {
            inputFileName += '.tex';
          }
          
          const inputFilePath = path.join(baseDir, inputFileName);
          try {
            const inputContent = await fs.readFile(inputFilePath, 'utf8');
            // Recursively resolve inputs inside the input file
            const resolvedInputContent = await resolveInputs(inputContent, path.dirname(inputFilePath));
            
            // Add a comment to help LLM understand context (optional but helpful)
            const wrappedContent = `\n% --- START OF ${m.filename} ---\n${resolvedInputContent}\n% --- END OF ${m.filename} ---\n`;
            
            resolvedContent = resolvedContent.replace(m.full, wrappedContent);
          } catch (err) {
            console.error(`Could not resolve input file: ${inputFilePath}`);
            // If file not found, just leave the \input tag intact
          }
        }
        return resolvedContent;
      };

      const finalConcatenatedContent = await resolveInputs(mainContent, templatePath);

      return res.json({ 
        success: true, 
        templateId: id,
        tex: finalConcatenatedContent 
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new TemplateController();
