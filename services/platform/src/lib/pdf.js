const PDFDocument = require('pdfkit');
const logger = require('./logger');

const generatePDF = (content) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            doc.text(content);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generatePDF };
