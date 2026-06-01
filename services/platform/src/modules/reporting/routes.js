const express = require('express');
const router = express.Router();
const { generatePDF } = require('../../lib/pdf');
const logger = require('../../lib/logger');

// POST /api/reports/generate
router.post('/generate', async (req, res) => {
    const { reportType, data } = req.body;
    try {
        const content = `Report Type: ${reportType}\nData: ${JSON.stringify(data, null, 2)}`;
        const pdfBuffer = await generatePDF(content);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
        res.send(pdfBuffer);
    } catch (err) {
        logger.error('Error generating report', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
