const express = require('express');
const templateController = require('../controller/template.controller');

const router = express.Router();

router.get('/', templateController.listTemplates);
router.get('/:id', templateController.getTemplateFiles);

module.exports = router;
