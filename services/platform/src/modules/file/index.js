const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const Minio = require('minio');
const multer = require('multer');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3006;
const BUCKET_NAME = process.env.MINIO_BUCKET || 'auraweb-assets';

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'file-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

// Database Setup
const pool = new Pool({
    host: process.env.DB_HOST || 'database',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'auraweb_db',
    user: process.env.DB_USER || 'auraweb_user',
    password: process.env.DB_PASSWORD,
});

// MinIO Setup
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin'
});

// Multer Setup (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'file-service' });
});

// Initialize Bucket
const initBucket = async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            // Public policy for read access
            const policy = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: ["s3:GetObject"],
                        Effect: "Allow",
                        Principal: { "AWS": ["*"] },
                        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
                    }
                ]
            };
            await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
            logger.info(`Bucket '${BUCKET_NAME}' created`);
        }
    } catch (err) {
        logger.error('Error initializing bucket', err);
    }
};

// Routes
app.post('/api/files/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileExtension = req.file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;

        // Upload to MinIO
        await minioClient.putObject(
            BUCKET_NAME,
            fileName,
            req.file.buffer,
            req.file.size,
            { 'Content-Type': req.file.mimetype }
        );

        const fileUrl = `/api/files/${fileName}`; // Proxied URL

        // Save Metadata to DB
        const result = await pool.query(
            'INSERT INTO files (filename, original_name, mimetype, size, url, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
            [fileName, req.file.originalname, req.file.mimetype, req.file.size, fileUrl]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        logger.error('Error uploading file', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get File (Proxy to MinIO)
app.get('/api/files/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const dataStream = await minioClient.getObject(BUCKET_NAME, filename);
        dataStream.pipe(res);
    } catch (err) {
        logger.error('Error fetching file', err);
        res.status(404).json({ error: 'File not found' });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM files ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        logger.error('Error fetching file list', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Initialization
const start = async () => {
    try {
        // Wait for MinIO
        // Retry logic often needed for MinIO startup
        setTimeout(initBucket, 5000);

        // Create Files Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS files (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255),
                mimetype VARCHAR(100),
                size INTEGER,
                url VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        logger.info('Database initialized');

        app.listen(PORT, () => {
            logger.info(`File Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
