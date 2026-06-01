const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const fastCsv = require('fast-csv');

// Configuration
require('dotenv').config();
const PORT = process.env.PORT || 3015;

// Logger Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'reporting-service' },
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

// Application Setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'reporting-service' });
});

// Reports API

// 1. Sales Report (PDF)
app.get('/api/reports/sales/pdf', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, total_amount, status, created_at 
            FROM orders 
            WHERE status = 'COMPLETED' 
            ORDER BY created_at DESC 
            LIMIT 100
        `);

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        doc.pipe(res);

        doc.fontSize(25).text('Sales Report', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        result.rows.forEach(order => {
            doc.text(`Order #${order.id} - $${order.total_amount} - ${new Date(order.created_at).toLocaleDateString()}`);
        });

        doc.end();
    } catch (err) {
        logger.error('Error generating PDF report', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Inventory Report (CSV)
app.get('/api/reports/inventory/csv', async (req, res) => {
    try {
        // Simple join to get product names with stock. 
        // In microservices, we might need data from Product Service, but assuming shared DB access for reports is common pattern for efficiency
        // OR we just query the 'inventory' table and assume product IDs are sufficient for this demo.
        const result = await pool.query('SELECT product_id, quantity, warehouse_location FROM inventory');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');

        const csvStream = fastCsv.format({ headers: true });
        csvStream.pipe(res);

        result.rows.forEach(row => csvStream.write(row));
        csvStream.end();

    } catch (err) {
        logger.error('Error generating CSV report', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Initialization
const start = async () => {
    try {
        // No specific table creation needed here, as it reads from others
        app.listen(PORT, () => {
            logger.info(`Reporting Service running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start service', err);
        process.exit(1);
    }
};

start();
