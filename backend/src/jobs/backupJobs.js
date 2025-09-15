const cron = require('node-cron');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const AWS = require('aws-sdk');
const logger = require('../utils/logger');
const compression = require('compression');

class BackupJobs {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || './backups';
        this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
        this.s3 = null;
        this.isRunning = false;

        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            this.s3 = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-1'
            });
        }

        this.ensureBackupDirectory();
    }

    /**
     * Initialize backup jobs
     */
    async initialize() {
        try {
            // Daily backup at 2 AM
            cron.schedule('0 2 * * *', async () => {
                await this.performDailyBackup();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Weekly full backup on Sunday at 3 AM
            cron.schedule('0 3 * * 0', async () => {
                await this.performWeeklyBackup();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Monthly backup on 1st at 4 AM
            cron.schedule('0 4 1 * *', async () => {
                await this.performMonthlyBackup();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            // Cleanup old backups daily at 5 AM
            cron.schedule('0 5 * * *', async () => {
                await this.cleanupOldBackups();
            }, {
                timezone: 'Asia/Ho_Chi_Minh'
            });

            logger.info('Backup jobs initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize backup jobs:', error);
            throw error;
        }
    }

    /**
     * Ensure backup directory exists
     */
    async ensureBackupDirectory() {
        try {
            await fs.access(this.backupDir);
        } catch {
            await fs.mkdir(this.backupDir, { recursive: true });
            logger.info(`Created backup directory: ${this.backupDir}`);
        }
    }

    /**
     * Perform daily backup
     */
    async performDailyBackup() {
        if (this.isRunning) {
            logger.warn('Backup already in progress, skipping daily backup');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('Starting daily backup...');

            const backupName = `daily_${new Date().toISOString().split('T')[0]}`;
            const backupPath = await this.createDatabaseBackup(backupName);

            // Backup uploaded files
            const filesBackupPath = await this.backupUploadedFiles(backupName);

            // Create configuration backup
            const configBackupPath = await this.backupConfiguration(backupName);

            // Compress all backups
            const compressedPath = await this.compressBackup(backupName, [
                backupPath,
                filesBackupPath,
                configBackupPath
            ]);

            // Upload to cloud if configured
            if (this.s3) {
                await this.uploadToS3(compressedPath, `daily/${path.basename(compressedPath)}`);
            }

            const duration = Date.now() - startTime;
            logger.info(`Daily backup completed successfully in ${duration}ms`, {
                backupName,
                size: await this.getFileSize(compressedPath),
                duration
            });

        } catch (error) {
            logger.error('Daily backup failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Perform weekly backup
     */
    async performWeeklyBackup() {
        if (this.isRunning) {
            logger.warn('Backup already in progress, skipping weekly backup');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('Starting weekly backup...');

            const backupName = `weekly_${new Date().toISOString().split('T')[0]}`;

            // Full database backup with indexes
            const backupPath = await this.createDatabaseBackup(backupName, true);

            // Backup all files
            const filesBackupPath = await this.backupUploadedFiles(backupName);

            // Backup logs
            const logsBackupPath = await this.backupLogs(backupName);

            // Configuration and environment backup
            const configBackupPath = await this.backupConfiguration(backupName);

            // Create full system backup
            const compressedPath = await this.compressBackup(backupName, [
                backupPath,
                filesBackupPath,
                logsBackupPath,
                configBackupPath
            ]);

            // Upload to cloud
            if (this.s3) {
                await this.uploadToS3(compressedPath, `weekly/${path.basename(compressedPath)}`);
            }

            const duration = Date.now() - startTime;
            logger.info(`Weekly backup completed successfully in ${duration}ms`, {
                backupName,
                size: await this.getFileSize(compressedPath),
                duration
            });

        } catch (error) {
            logger.error('Weekly backup failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Perform monthly backup
     */
    async performMonthlyBackup() {
        if (this.isRunning) {
            logger.warn('Backup already in progress, skipping monthly backup');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('Starting monthly backup...');

            const date = new Date();
            const backupName = `monthly_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            // Complete system backup
            const backupPath = await this.createDatabaseBackup(backupName, true);
            const filesBackupPath = await this.backupUploadedFiles(backupName);
            const logsBackupPath = await this.backupLogs(backupName);
            const configBackupPath = await this.backupConfiguration(backupName);

            // Generate backup report
            const reportPath = await this.generateBackupReport(backupName);

            const compressedPath = await this.compressBackup(backupName, [
                backupPath,
                filesBackupPath,
                logsBackupPath,
                configBackupPath,
                reportPath
            ]);

            // Upload to cloud with long-term retention
            if (this.s3) {
                await this.uploadToS3(compressedPath, `monthly/${path.basename(compressedPath)}`, {
                    StorageClass: 'GLACIER'
                });
            }

            const duration = Date.now() - startTime;
            logger.info(`Monthly backup completed successfully in ${duration}ms`, {
                backupName,
                size: await this.getFileSize(compressedPath),
                duration
            });

        } catch (error) {
            logger.error('Monthly backup failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Create database backup using mongodump
     */
    async createDatabaseBackup(backupName, includeIndexes = false) {
        return new Promise((resolve, reject) => {
            const outputDir = path.join(this.backupDir, backupName, 'database');
            const mongoUri = process.env.MONGODB_URI;

            if (!mongoUri) {
                reject(new Error('MongoDB URI not configured'));
                return;
            }

            const args = [
                '--uri', mongoUri,
                '--out', outputDir
            ];

            if (!includeIndexes) {
                args.push('--noIndexRestore');
            }

            const mongodump = spawn('mongodump', args);

            let errorOutput = '';

            mongodump.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            mongodump.on('close', (code) => {
                if (code === 0) {
                    logger.info('Database backup created successfully', { backupName, outputDir });
                    resolve(outputDir);
                } else {
                    logger.error('Database backup failed', { code, error: errorOutput });
                    reject(new Error(`mongodump exited with code ${code}: ${errorOutput}`));
                }
            });

            mongodump.on('error', (error) => {
                logger.error('Failed to start mongodump:', error);
                reject(error);
            });
        });
    }

    /**
     * Backup uploaded files
     */
    async backupUploadedFiles(backupName) {
        const uploadDir = process.env.UPLOAD_PATH || './uploads';
        const backupPath = path.join(this.backupDir, backupName, 'files');

        try {
            await fs.access(uploadDir);
            await fs.mkdir(backupPath, { recursive: true });

            // Copy files recursively
            await this.copyDirectory(uploadDir, backupPath);

            logger.info('Files backup completed', { backupName, backupPath });
            return backupPath;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('Upload directory does not exist, skipping files backup');
                return null;
            }
            throw error;
        }
    }

    /**
     * Backup log files
     */
    async backupLogs(backupName) {
        const logDir = process.env.LOG_FILE_PATH || './logs';
        const backupPath = path.join(this.backupDir, backupName, 'logs');

        try {
            await fs.access(logDir);
            await fs.mkdir(backupPath, { recursive: true });

            // Copy only recent log files (last 7 days)
            const files = await fs.readdir(logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7);

            for (const file of files) {
                const filePath = path.join(logDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime > cutoffDate) {
                    const destPath = path.join(backupPath, file);
                    await fs.copyFile(filePath, destPath);
                }
            }

            logger.info('Logs backup completed', { backupName, backupPath });
            return backupPath;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('Log directory does not exist, skipping logs backup');
                return null;
            }
            throw error;
        }
    }

    /**
     * Backup configuration files
     */
    async backupConfiguration(backupName) {
        const backupPath = path.join(this.backupDir, backupName, 'config');
        await fs.mkdir(backupPath, { recursive: true });

        // Backup package.json
        try {
            await fs.copyFile('./package.json', path.join(backupPath, 'package.json'));
        } catch (error) {
            logger.warn('Could not backup package.json:', error.message);
        }

        // Backup environment template (not actual .env)
        const envTemplate = Object.keys(process.env)
            .filter(key => key.startsWith('NODE_') || key.startsWith('PORT') || key.startsWith('API_'))
            .reduce((obj, key) => {
                obj[key] = '[REDACTED]';
                return obj;
            }, {});

        await fs.writeFile(
            path.join(backupPath, 'environment-template.json'),
            JSON.stringify(envTemplate, null, 2)
        );

        // Backup system info
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            backupTime: new Date().toISOString(),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };

        await fs.writeFile(
            path.join(backupPath, 'system-info.json'),
            JSON.stringify(systemInfo, null, 2)
        );

        logger.info('Configuration backup completed', { backupName, backupPath });
        return backupPath;
    }

    /**
     * Generate backup report
     */
    async generateBackupReport(backupName) {
        const reportPath = path.join(this.backupDir, backupName, 'backup-report.json');

        // Get database statistics
        const dbStats = await this.getDatabaseStats();

        // Get file system statistics
        const fileStats = await this.getFileSystemStats();

        const report = {
            backupName,
            timestamp: new Date().toISOString(),
            type: 'monthly',
            database: dbStats,
            filesystem: fileStats,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        logger.info('Backup report generated', { backupName, reportPath });
        return reportPath;
    }

    /**
     * Compress backup files
     */
    async compressBackup(backupName, paths) {
        const tar = require('tar');
        const backupDir = path.join(this.backupDir, backupName);
        const compressedPath = `${backupDir}.tar.gz`;

        // Filter out null paths
        const validPaths = paths.filter(p => p !== null);

        await tar.create(
            {
                gzip: true,
                file: compressedPath,
                cwd: this.backupDir
            },
            [backupName]
        );

        // Remove uncompressed directory
        await this.removeDirectory(backupDir);

        logger.info('Backup compressed successfully', {
            backupName,
            compressedPath,
            size: await this.getFileSize(compressedPath)
        });

        return compressedPath;
    }

    /**
     * Upload backup to S3
     */
    async uploadToS3(filePath, key, options = {}) {
        if (!this.s3) {
            logger.warn('S3 not configured, skipping cloud upload');
            return;
        }

        const fileContent = await fs.readFile(filePath);
        const bucketName = process.env.S3_BACKUP_BUCKET;

        if (!bucketName) {
            logger.warn('S3 backup bucket not configured');
            return;
        }

        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent,
            StorageClass: options.StorageClass || 'STANDARD',
            ServerSideEncryption: 'AES256'
        };

        await this.s3.upload(uploadParams).promise();

        logger.info('Backup uploaded to S3', { filePath, key, bucket: bucketName });
    }

    /**
     * Clean up old backups
     */
    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    deletedCount++;
                    logger.info('Deleted old backup', { file, age: Date.now() - stats.mtime.getTime() });
                }
            }

            logger.info(`Cleanup completed, deleted ${deletedCount} old backups`);

            // Clean up S3 old backups if configured
            if (this.s3) {
                await this.cleanupS3Backups();
            }

        } catch (error) {
            logger.error('Backup cleanup failed:', error);
        }
    }

    /**
     * Clean up old S3 backups
     */
    async cleanupS3Backups() {
        const bucketName = process.env.S3_BACKUP_BUCKET;
        if (!bucketName) return;

        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

            const objects = await this.s3.listObjectsV2({ Bucket: bucketName }).promise();

            for (const object of objects.Contents || []) {
                if (object.LastModified < cutoffDate && object.Key.startsWith('daily/')) {
                    await this.s3.deleteObject({
                        Bucket: bucketName,
                        Key: object.Key
                    }).promise();

                    logger.info('Deleted old S3 backup', { key: object.Key });
                }
            }
        } catch (error) {
            logger.error('S3 backup cleanup failed:', error);
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupPath, options = {}) {
        if (this.isRunning) {
            throw new Error('Cannot restore while backup is running');
        }

        this.isRunning = true;

        try {
            logger.info('Starting backup restoration', { backupPath });

            // Extract backup
            const extractPath = await this.extractBackup(backupPath);

            // Restore database
            if (options.restoreDatabase !== false) {
                await this.restoreDatabase(path.join(extractPath, 'database'));
            }

            // Restore files
            if (options.restoreFiles !== false) {
                await this.restoreFiles(path.join(extractPath, 'files'));
            }

            logger.info('Backup restoration completed successfully');

        } catch (error) {
            logger.error('Backup restoration failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    // Helper methods
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    async removeDirectory(dir) {
        try {
            await fs.rmdir(dir, { recursive: true });
        } catch (error) {
            // Fallback for older Node.js versions
            await fs.rm(dir, { recursive: true, force: true });
        }
    }

    async getFileSize(filePath) {
        const stats = await fs.stat(filePath);
        return this.formatBytes(stats.size);
    }

    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    async getDatabaseStats() {
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();
            const collections = await db.listCollections().toArray();

            return {
                collections: collections.length,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
                indexes: stats.indexes,
                objects: stats.objects
            };
        } catch (error) {
            logger.error('Failed to get database stats:', error);
            return { error: error.message };
        }
    }

    async getFileSystemStats() {
        try {
            const uploadDir = process.env.UPLOAD_PATH || './uploads';
            let totalSize = 0;
            let fileCount = 0;

            const calculateSize = async (dir) => {
                try {
                    const files = await fs.readdir(dir);
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const stats = await fs.stat(filePath);
                        if (stats.isDirectory()) {
                            await calculateSize(filePath);
                        } else {
                            totalSize += stats.size;
                            fileCount++;
                        }
                    }
                } catch (error) {
                    // Directory might not exist
                }
            };

            await calculateSize(uploadDir);

            return {
                totalFiles: fileCount,
                totalSize: this.formatBytes(totalSize)
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Get backup status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            backupDir: this.backupDir,
            retentionDays: this.retentionDays,
            s3Configured: !!this.s3
        };
    }

    /**
     * Perform manual backup
     */
    async performManualBackup(type = 'manual') {
        const backupName = `manual_${Date.now()}`;

        switch (type) {
            case 'database':
                return await this.createDatabaseBackup(backupName);
            case 'files':
                return await this.backupUploadedFiles(backupName);
            case 'full':
            default:
                return await this.performDailyBackup();
        }
    }
}

module.exports = new BackupJobs();