const amqp = require('amqplib');
const logger = require('./logger');

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
    try {
        const amqpServer = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
        connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();

        await channel.assertQueue('ORDER_CREATED');
        await channel.assertQueue('PAYMENT_PROCESSED');
        await channel.assertQueue('PAYMENT_FAILED');
        await channel.assertQueue('ORDER_PAID');

        logger.info('Connected to RabbitMQ');
        return channel;
    } catch (err) {
        logger.error('Failed to connect to RabbitMQ', err);
        throw err;
    }
};

const getChannel = () => channel;

module.exports = {
    connectRabbitMQ,
    getChannel,
};
