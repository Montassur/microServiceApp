const { Client } = require('@elastic/elasticsearch');
const logger = require('./logger');

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    auth: {
        username: process.env.ELASTIC_USERNAME,
        password: process.env.ELASTIC_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = esClient;
