const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.connection = null;
    }

    async connect() {
        try {
            // Kiểm tra nếu đã kết nối
            if (this.isConnected()) {
                logger.info('Sẵn sàng kết nối đến MongoDB');
                return this.connection;
            }

            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
                bufferMaxEntries: 0,
            };

            // Kết nối đến MongoDB
            this.connection = await mongoose.connect(process.env.MONGODB_URI, options);
            logger.info(`MongoDB đã kết nối thành công: ${mongoose.connection.name}`);

            // Xử lý các sự kiện kết nối
            mongoose.connection.on('error', (error) => {
                logger.error('MongoDB lỗi:', error);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
            });

            mongoose.connection.on('reconnected', () => {
                logger.info('MongoDB reconnected');
            });

            // Graceful shutdown
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                await this.disconnect();
                process.exit(0);
            });

            return this.connection;
        } catch (error) {
            logger.error('MongoDB kết nối lỗi:', error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.connection.close();
                this.connection = null;
                logger.info('MongoDB connection closed');
            }
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error);
        }
    }

    getConnection() {
        return this.connection;
    }

    isConnected() {
        return mongoose.connection.readyState === 1;
    }

    // Thêm method để lấy thông tin kết nối
    getConnectionInfo() {
        if (this.isConnected()) {
            return {
                status: 'connected',
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                name: mongoose.connection.name,
                readyState: mongoose.connection.readyState
            };
        }
        return { status: 'disconnected', readyState: mongoose.connection.readyState };
    }
}

module.exports = new Database();