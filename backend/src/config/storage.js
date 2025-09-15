const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class StorageService {
    constructor() {
        this.s3 = null;
        this.storage = null;
        this.storageType = process.env.STORAGE_TYPE || 'local'; // 'local', 's3', 'cloudinary'
        this.uploadPath = process.env.UPLOAD_PATH || './uploads';
        this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
        this.allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ];
    }

    async initialize() {
        try {
            switch (this.storageType) {
                case 's3':
                    await this.initializeS3();
                    break;
                case 'cloudinary':
                    await this.initializeCloudinary();
                    break;
                case 'local':
                default:
                    await this.initializeLocal();
                    break;
            }

            logger.info(`Storage service initialized: ${this.storageType}`);
        } catch (error) {
            logger.error('Storage service initialization failed:', error);
            throw error;
        }
    }

    async initializeLocal() {
        // Ensure upload directories exist
        const directories = [
            this.uploadPath,
            path.join(this.uploadPath, 'avatars'),
            path.join(this.uploadPath, 'events'),
            path.join(this.uploadPath, 'banners'),
            path.join(this.uploadPath, 'documents'),
            path.join(this.uploadPath, 'temp')
        ];

        for (const dir of directories) {
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            }
        }

        // Configure multer for local storage
        this.storage = multer.diskStorage({
            destination: (req, file, cb) => {
                let uploadDir = this.uploadPath;

                if (file.fieldname === 'avatar') {
                    uploadDir = path.join(this.uploadPath, 'avatars');
                } else if (file.fieldname === 'banner') {
                    uploadDir = path.join(this.uploadPath, 'banners');
                } else if (file.fieldname === 'document') {
                    uploadDir = path.join(this.uploadPath, 'documents');
                } else {
                    uploadDir = path.join(this.uploadPath, 'temp');
                }

                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(file.originalname);
                const name = file.fieldname + '-' + uniqueSuffix + ext;
                cb(null, name);
            }
        });
    }

    async initializeS3() {
        // Configure AWS S3
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
        });

        // Test S3 connection
        try {
            await this.s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
            logger.info('S3 connection successful');
        } catch (error) {
            throw new Error(`S3 connection failed: ${error.message}`);
        }

        // Configure multer for S3
        this.storage = multerS3({
            s3: this.s3,
            bucket: process.env.S3_BUCKET_NAME,
            acl: 'public-read',
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: (req, file, cb) => {
                let folder = 'uploads';

                if (file.fieldname === 'avatar') {
                    folder = 'avatars';
                } else if (file.fieldname === 'banner') {
                    folder = 'banners';
                } else if (file.fieldname === 'document') {
                    folder = 'documents';
                }

                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(file.originalname);
                const key = `${folder}/${file.fieldname}-${uniqueSuffix}${ext}`;
                cb(null, key);
            }
        });
    }

    async initializeCloudinary() {
        const cloudinary = require('cloudinary').v2;
        const { CloudinaryStorage } = require('multer-storage-cloudinary');

        // Configure Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });

        // Test Cloudinary connection
        try {
            await cloudinary.api.ping();
            logger.info('Cloudinary connection successful');
        } catch (error) {
            throw new Error(`Cloudinary connection failed: ${error.message}`);
        }

        // Configure multer for Cloudinary
        this.storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: {
                folder: (req, file) => {
                    if (file.fieldname === 'avatar') return 'avatars';
                    if (file.fieldname === 'banner') return 'banners';
                    if (file.fieldname === 'document') return 'documents';
                    return 'uploads';
                },
                format: async (req, file) => {
                    if (file.mimetype.startsWith('image/')) {
                        return 'jpg'; // Convert all images to jpg
                    }
                    return path.extname(file.originalname).substring(1);
                },
                public_id: (req, file) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    return file.fieldname + '-' + uniqueSuffix;
                }
            }
        });
    }

    getUploadMiddleware(fieldName = 'file', options = {}) {
        const uploadOptions = {
            storage: this.storage,
            limits: {
                fileSize: options.maxSize || this.maxFileSize,
                files: options.maxFiles || 1
            },
            fileFilter: (req, file, cb) => {
                // Check file type
                const allowedTypes = options.allowedTypes || this.allowedMimeTypes;
                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error(`File type ${file.mimetype} not allowed`), false);
                }
            }
        };

        const upload = multer(uploadOptions);

        if (Array.isArray(fieldName)) {
            return upload.fields(fieldName);
        } else if (options.multiple) {
            return upload.array(fieldName, options.maxFiles || 5);
        } else {
            return upload.single(fieldName);
        }
    }

    async deleteFile(filePath) {
        try {
            switch (this.storageType) {
                case 's3':
                    await this.deleteFromS3(filePath);
                    break;
                case 'cloudinary':
                    await this.deleteFromCloudinary(filePath);
                    break;
                case 'local':
                default:
                    await this.deleteFromLocal(filePath);
                    break;
            }

            logger.logFileOperation('delete', filePath);
            return true;
        } catch (error) {
            logger.error('Error deleting file:', error);
            return false;
        }
    }

    async deleteFromLocal(filePath) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
        await fs.unlink(fullPath);
    }

    async deleteFromS3(key) {
        await this.s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        }).promise();
    }

    async deleteFromCloudinary(publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(publicId);
    }

    async moveFile(sourcePath, destinationPath) {
        try {
            switch (this.storageType) {
                case 's3':
                    await this.moveFileInS3(sourcePath, destinationPath);
                    break;
                case 'local':
                default:
                    await this.moveFileLocal(sourcePath, destinationPath);
                    break;
            }

            logger.logFileOperation('move', sourcePath);
            return true;
        } catch (error) {
            logger.error('Error moving file:', error);
            return false;
        }
    }

    async moveFileLocal(sourcePath, destinationPath) {
        const fullSourcePath = path.isAbsolute(sourcePath) ? sourcePath : path.join(this.uploadPath, sourcePath);
        const fullDestPath = path.isAbsolute(destinationPath) ? destinationPath : path.join(this.uploadPath, destinationPath);

        // Ensure destination directory exists
        await fs.mkdir(path.dirname(fullDestPath), { recursive: true });

        await fs.rename(fullSourcePath, fullDestPath);
    }

    async moveFileInS3(sourceKey, destinationKey) {
        // Copy object to new location
        await this.s3.copyObject({
            Bucket: process.env.S3_BUCKET_NAME,
            CopySource: `${process.env.S3_BUCKET_NAME}/${sourceKey}`,
            Key: destinationKey
        }).promise();

        // Delete original object
        await this.deleteFromS3(sourceKey);
    }

    async getFileInfo(filePath) {
        try {
            switch (this.storageType) {
                case 's3':
                    return await this.getS3FileInfo(filePath);
                case 'cloudinary':
                    return await this.getCloudinaryFileInfo(filePath);
                case 'local':
                default:
                    return await this.getLocalFileInfo(filePath);
            }
        } catch (error) {
            logger.error('Error getting file info:', error);
            return null;
        }
    }

    async getLocalFileInfo(filePath) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadPath, filePath);
        const stats = await fs.stat(fullPath);

        return {
            size: stats.size,
            lastModified: stats.mtime,
            created: stats.birthtime,
            exists: true
        };
    }

    async getS3FileInfo(key) {
        const result = await this.s3.headObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        }).promise();

        return {
            size: result.ContentLength,
            lastModified: result.LastModified,
            etag: result.ETag,
            exists: true
        };
    }

    async getCloudinaryFileInfo(publicId) {
        const cloudinary = require('cloudinary').v2;
        const result = await cloudinary.api.resource(publicId);

        return {
            size: result.bytes,
            lastModified: new Date(result.created_at),
            format: result.format,
            exists: true
        };
    }

    getFileUrl(filePath, options = {}) {
        switch (this.storageType) {
            case 's3':
                return this.getS3Url(filePath, options);
            case 'cloudinary':
                return this.getCloudinaryUrl(filePath, options);
            case 'local':
            default:
                return this.getLocalUrl(filePath);
        }
    }

    getLocalUrl(filePath) {
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        return `${baseUrl}/uploads/${filePath}`;
    }

    getS3Url(key, options = {}) {
        if (options.signedUrl) {
            return this.s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key,
                Expires: options.expires || 3600 // 1 hour default
            });
        }

        return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    getCloudinaryUrl(publicId, options = {}) {
        const cloudinary = require('cloudinary').v2;

        const transformOptions = {
            width: options.width,
            height: options.height,
            crop: options.crop || 'fill',
            quality: options.quality || 'auto',
            format: options.format || 'auto'
        };

        // Remove undefined values
        Object.keys(transformOptions).forEach(key => {
            if (transformOptions[key] === undefined) {
                delete transformOptions[key];
            }
        });

        return cloudinary.url(publicId, transformOptions);
    }

    async generateThumbnail(filePath, options = {}) {
        if (this.storageType === 'cloudinary') {
            // Cloudinary handles thumbnails automatically
            return this.getCloudinaryUrl(filePath, {
                width: options.width || 150,
                height: options.height || 150,
                crop: 'thumb'
            });
        }

        // For local and S3, we'd need to implement thumbnail generation
        // This could use libraries like sharp for image processing
        const sharp = require('sharp');

        try {
            const inputPath = this.storageType === 'local' ?
                path.join(this.uploadPath, filePath) :
                await this.downloadFromS3(filePath);

            const thumbnailPath = filePath.replace(/(\.[^.]+)$/, '_thumb$1');
            const outputPath = this.storageType === 'local' ?
                path.join(this.uploadPath, thumbnailPath) :
                path.join(this.uploadPath, 'temp', thumbnailPath);

            await sharp(inputPath)
                .resize(options.width || 150, options.height || 150)
                .jpeg({ quality: 80 })
                .toFile(outputPath);

            if (this.storageType === 's3') {
                // Upload thumbnail back to S3
                await this.uploadToS3(outputPath, thumbnailPath);
                // Clean up local temp file
                await fs.unlink(outputPath);
            }

            return this.getFileUrl(thumbnailPath);
        } catch (error) {
            logger.error('Error generating thumbnail:', error);
            return null;
        }
    }

    async downloadFromS3(key) {
        const tempPath = path.join(this.uploadPath, 'temp', path.basename(key));
        const file = await this.s3.getObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        }).promise();

        await fs.writeFile(tempPath, file.Body);
        return tempPath;
    }

    async uploadToS3(localPath, key) {
        const fileContent = await fs.readFile(localPath);

        await this.s3.upload({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ACL: 'public-read'
        }).promise();
    }

    async cleanupTempFiles() {
        try {
            const tempDir = path.join(this.uploadPath, 'temp');
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    logger.info(`Cleaned up temp file: ${file}`);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up temp files:', error);
        }
    }

    async getStorageStats() {
        try {
            switch (this.storageType) {
                case 'local':
                    return await this.getLocalStorageStats();
                case 's3':
                    return await this.getS3StorageStats();
                case 'cloudinary':
                    return await this.getCloudinaryStats();
                default:
                    return { error: 'Storage type not supported for stats' };
            }
        } catch (error) {
            logger.error('Error getting storage stats:', error);
            return { error: error.message };
        }
    }

    async getLocalStorageStats() {
        const stats = {
            totalFiles: 0,
            totalSize: 0,
            directories: {}
        };

        const scanDirectory = async (dir, prefix = '') => {
            const files = await fs.readdir(dir, { withFileTypes: true });

            for (const file of files) {
                const fullPath = path.join(dir, file.name);

                if (file.isDirectory()) {
                    stats.directories[prefix + file.name] = 0;
                    await scanDirectory(fullPath, prefix + file.name + '/');
                } else {
                    const fileStats = await fs.stat(fullPath);
                    stats.totalFiles++;
                    stats.totalSize += fileStats.size;

                    const dirKey = prefix || 'root';
                    stats.directories[dirKey] = (stats.directories[dirKey] || 0) + 1;
                }
            }
        };

        await scanDirectory(this.uploadPath);

        return {
            ...stats,
            totalSizeFormatted: this.formatBytes(stats.totalSize)
        };
    }

    async getS3StorageStats() {
        // This would require iterating through S3 objects
        // For large buckets, this could be expensive
        return {
            message: 'S3 stats require implementation with pagination',
            storageType: 's3'
        };
    }

    async getCloudinaryStats() {
        const cloudinary = require('cloudinary').v2;
        const usage = await cloudinary.api.usage();

        return {
            totalFiles: usage.resources,
            totalSize: usage.credits,
            bandwidth: usage.bandwidth,
            storage: usage.storage,
            storageType: 'cloudinary'
        };
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    async healthCheck() {
        try {
            switch (this.storageType) {
                case 's3':
                    await this.s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME }).promise();
                    return { status: 'healthy', storage: 's3' };
                case 'cloudinary':
                    const cloudinary = require('cloudinary').v2;
                    await cloudinary.api.ping();
                    return { status: 'healthy', storage: 'cloudinary' };
                case 'local':
                default:
                    await fs.access(this.uploadPath);
                    return { status: 'healthy', storage: 'local' };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                storage: this.storageType,
                error: error.message
            };
        }
    }
}

module.exports = new StorageService();