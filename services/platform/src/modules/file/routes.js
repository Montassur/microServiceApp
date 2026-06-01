const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3 = require('../../lib/s3');
const logger = require('../../lib/logger');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/files/upload
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME || 'my-bucket',
            Key: `${Date.now()}-${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };

        const result = await s3.upload(params).promise();
        res.json({ url: result.Location, key: result.Key });

    } catch (err) {
        logger.error('Error uploading file', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

module.exports = router;
