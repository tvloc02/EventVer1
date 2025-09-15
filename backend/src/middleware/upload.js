const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const { ValidationError } = require('./errorHandler');
const logger = require('../utils/logger');

// Create upload directories
const createUploadDirs = async () => {
    const dirs = [
        'uploads/avatars',
        'uploads/events',
        'uploads/certificates',
        'uploads/imports',
        'uploads/exports',
        'uploads/temp',
        'uploads/documents',
        'uploads/images'
    ];

    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch (error) {
            await fs.mkdir(dir, { recursive: true });
            logger.info(`Created upload directory: ${dir}`);
        }
    }
};

// Initialize upload directories
createUploadDirs().catch(error => {
    logger.error('Failed to create upload directories:', error);
});

// File type configurations
const fileTypes = {
    images: {
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maxSize: 5 * 1024 * 1024, // 5MB
        extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    },
    documents: {
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ],
        maxSize: 10 * 1024 * 1024, // 10MB
        extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv']
    },
    any: {
        mimeTypes: '*',
        maxSize: 20 * 1024 * 1024, // 20MB
        extensions: '*'
    }
};

// Generate unique filename
const generateFileName = (originalName, prefix = '') => {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}${timestamp}-${random}${ext}`;
};

// Create storage configuration
const createStorage = (destination, namePrefix = '') => {
    return multer.diskStorage({
        destination: async (req, file, cb) => {
            try {
                const uploadPath = path.join('uploads', destination);
                await fs.access(uploadPath);
                cb(null, uploadPath);
            } catch (error) {
                await fs.mkdir(path.join('uploads', destination), { recursive: true });
                cb(null, path.join('uploads', destination));
            }
        },
        filename: (req, file, cb) => {
            const fileName = generateFileName(file.originalname, namePrefix);
            cb(null, fileName);
        }
    });
};

// File filter factory
const createFileFilter = (allowedTypes = 'any') => {
    return (req, file, cb) => {
        const config = fileTypes[allowedTypes] || fileTypes.any;

        // Check MIME type
        if (config.mimeTypes !== '*' && !config.mimeTypes.includes(file.mimetype)) {
            const error = new ValidationError(`Invalid file type. Allowed types: ${config.mimeTypes.join(', ')}`);
            return cb(error, false);
        }

        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (config.extensions !== '*' && !config.extensions.includes(ext)) {
            const error = new ValidationError(`Invalid file extension. Allowed extensions: ${config.extensions.join(', ')}`);
            return cb(error, false);
        }

        // Log file upload attempt
        logger.logFileOperation('upload_attempt', file.originalname, req.user?.userId, file.size);

        cb(null, true);
    };
};

// Create multer configuration
const createMulterConfig = (destination, allowedTypes = 'any', namePrefix = '') => {
    const config = fileTypes[allowedTypes] || fileTypes.any;

    return multer({
        storage: createStorage(destination, namePrefix),
        fileFilter: createFileFilter(allowedTypes),
        limits: {
            fileSize: config.maxSize,
            files: 10, // Maximum number of files
            fields: 20, // Maximum number of non-file fields
            fieldSize: 1 * 1024 * 1024 // 1MB per field
        },
        onError: (error, next) => {
            logger.error('Multer error:', error);
            next(error);
        }
    });
};

// Image processing middleware
const processImage = (options = {}) => {
    return async (req, res, next) => {
        if (!req.file || !req.file.mimetype.startsWith('image/')) {
            return next();
        }

        try {
            const {
                width = 800,
                height = 600,
                quality = 80,
                format = 'jpeg',
                createThumbnail = false,
                thumbnailSize = 150
            } = options;

            const inputPath = req.file.path;
            const ext = format === 'jpeg' ? 'jpg' : format;
            const outputPath = inputPath.replace(path.extname(inputPath), `.${ext}`);

            // Process main image
            let imageProcessor = sharp(inputPath)
                .resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                });

            if (format === 'jpeg') {
                imageProcessor = imageProcessor.jpeg({ quality });
            } else if (format === 'png') {
                imageProcessor = imageProcessor.png({ quality });
            } else if (format === 'webp') {
                imageProcessor = imageProcessor.webp({ quality });
            }

            await imageProcessor.toFile(outputPath);

            // Create thumbnail if requested
            if (createThumbnail) {
                const thumbnailPath = outputPath.replace(`.${ext}`, `_thumb.${ext}`);
                await sharp(inputPath)
                    .resize(thumbnailSize, thumbnailSize, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .jpeg({ quality: 70 })
                    .toFile(thumbnailPath);

                req.file.thumbnail = thumbnailPath.replace('uploads/', '');
            }

            // Remove original if different format
            if (inputPath !== outputPath) {
                await fs.unlink(inputPath);
            }

            // Update file info
            req.file.path = outputPath;
            req.file.filename = path.basename(outputPath);
            req.file.processed = true;

            logger.logFileOperation('image_processed', req.file.originalname, req.user?.userId, req.file.size);

            next();
        } catch (error) {
            logger.error('Image processing error:', error);
            next(error);
        }
    };
};

// File validation middleware
const validateFile = (options = {}) => {
    return (req, res, next) => {
        if (!req.file && options.required) {
            return next(new ValidationError('File is required'));
        }

        if (!req.file) {
            return next();
        }

        const {
            minSize = 0,
            maxSize = 20 * 1024 * 1024,
            allowedMimeTypes = [],
            customValidator
        } = options;

        // Size validation
        if (req.file.size < minSize) {
            return next(new ValidationError(`File size must be at least ${minSize} bytes`));
        }

        if (req.file.size > maxSize) {
            return next(new ValidationError(`File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`));
        }

        // MIME type validation
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(req.file.mimetype)) {
            return next(new ValidationError(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`));
        }

        // Custom validation
        if (customValidator && typeof customValidator === 'function') {
            const validationResult = customValidator(req.file);
            if (validationResult !== true) {
                return next(new ValidationError(validationResult || 'File validation failed'));
            }
        }

        next();
    };
};

// Cleanup temporary files
const cleanupTempFiles = async (req, res, next) => {
    const originalEnd = res.end;

    res.end = function(chunk, encoding) {
        originalEnd.call(this, chunk, encoding);

        // Cleanup files after response is sent
        if (req.files) {
            // Multiple files
            Object.values(req.files).flat().forEach(async (file) => {
                if (file.path.includes('/temp/')) {
                    try {
                        await fs.unlink(file.path);
                        logger.debug('Cleaned up temp file:', file.filename);
                    } catch (error) {
                        logger.error('Failed to cleanup temp file:', error);
                    }
                }
            });
        } else if (req.file && req.file.path.includes('/temp/')) {
            // Single file
            fs.unlink(req.file.path).catch(error => {
                logger.error('Failed to cleanup temp file:', error);
            });
        }
    };

    next();
};

// Security scan middleware (basic)
const scanFile = (req, res, next) => {
    if (!req.file) {
        return next();
    }

    // Basic security checks
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (suspiciousExtensions.includes(fileExt)) {
        logger.security('Suspicious file upload attempt', {
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            userId: req.user?.userId,
            ip: req.ip
        });
        return next(new ValidationError('File type not allowed for security reasons'));
    }

    // Check for embedded executables in documents
    if (req.file.mimetype.includes('application/') && req.file.size > 50 * 1024 * 1024) {
        logger.security('Large document upload', {
            filename: req.file.originalname,
            size: req.file.size,
            userId: req.user?.userId,
            ip: req.ip
        });
    }

    next();
};

// Predefined upload configurations
const uploadConfigs = {
    // Avatar upload
    avatar: createMulterConfig('avatars', 'images', 'avatar-'),

    // Event banner/poster
    eventImage: createMulterConfig('events', 'images', 'event-'),

    // Document upload
    document: createMulterConfig('documents', 'documents', 'doc-'),

    // Import/export files
    importFile: createMulterConfig('imports', 'documents', 'import-'),
    exportFile: createMulterConfig('exports', 'documents', 'export-'),

    // Temporary uploads
    temp: createMulterConfig('temp', 'any', 'temp-'),

    // Certificate templates
    certificateTemplate: createMulterConfig('certificates', 'images', 'template-'),

    // General file upload
    general: createMulterConfig('uploads', 'any', 'file-')
};

// Upload middleware factory
const createUploadMiddleware = (config, options = {}) => {
    const middleware = [
        config,
        scanFile,
        validateFile(options.validation || {}),
        options.processImages ? processImage(options.imageProcessing || {}) : null,
        options.cleanup ? cleanupTempFiles : null
    ].filter(Boolean);

    return middleware;
};

// Predefined middleware combinations
const upload = {
    // Single file uploads
    single: (fieldName, uploadType = 'general', options = {}) => {
        const config = uploadConfigs[uploadType];
        if (!config) {
            throw new Error(`Unknown upload type: ${uploadType}`);
        }

        return createUploadMiddleware(config.single(fieldName), options);
    },

    // Multiple files upload
    array: (fieldName, maxCount = 5, uploadType = 'general', options = {}) => {
        const config = uploadConfigs[uploadType];
        if (!config) {
            throw new Error(`Unknown upload type: ${uploadType}`);
        }

        return createUploadMiddleware(config.array(fieldName, maxCount), options);
    },

    // Multiple fields upload
    fields: (fields, uploadType = 'general', options = {}) => {
        const config = uploadConfigs[uploadType];
        if (!config) {
            throw new Error(`Unknown upload type: ${uploadType}`);
        }

        return createUploadMiddleware(config.fields(fields), options);
    },

    // Any files upload
    any: (uploadType = 'general', options = {}) => {
        const config = uploadConfigs[uploadType];
        if (!config) {
            throw new Error(`Unknown upload type: ${uploadType}`);
        }

        return createUploadMiddleware(config.any(), options);
    },

    // No files (for multipart forms without files)
    none: (uploadType = 'general') => {
        const config = uploadConfigs[uploadType];
        if (!config) {
            throw new Error(`Unknown upload type: ${uploadType}`);
        }

        return config.none();
    }
};

// File management utilities
const fileUtils = {
    // Delete file
    deleteFile: async (filePath) => {
        try {
            await fs.unlink(path.join(process.cwd(), filePath));
            logger.logFileOperation('delete', path.basename(filePath));
            return true;
        } catch (error) {
            logger.error('File deletion error:', error);
            return false;
        }
    },

    // Move file
    moveFile: async (sourcePath, destinationPath) => {
        try {
            await fs.rename(sourcePath, destinationPath);
            logger.logFileOperation('move', path.basename(sourcePath));
            return true;
        } catch (error) {
            logger.error('File move error:', error);
            return false;
        }
    },

    // Get file info
    getFileInfo: async (filePath) => {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            return null;
        }
    },

    // Generate secure URL
    generateSecureUrl: (filePath, expiresIn = 3600) => {
        const timestamp = Date.now() + (expiresIn * 1000);
        const hash = crypto
            .createHmac('sha256', process.env.JWT_SECRET || 'secret')
            .update(`${filePath}:${timestamp}`)
            .digest('hex');

        return `/api/v1/files/secure/${encodeURIComponent(filePath)}?expires=${timestamp}&signature=${hash}`;
    },

    // Validate secure URL
    validateSecureUrl: (filePath, expires, signature) => {
        const now = Date.now();
        if (now > parseInt(expires)) {
            return false;
        }

        const expectedHash = crypto
            .createHmac('sha256', process.env.JWT_SECRET || 'secret')
            .update(`${filePath}:${expires}`)
            .digest('hex');

        return signature === expectedHash;
    }
};

// Cleanup old files (scheduled task)
const cleanupOldFiles = async () => {
    const tempDir = path.join(process.cwd(), 'uploads/temp');
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    try {
        const files = await fs.readdir(tempDir);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
                await fs.unlink(filePath);
                logger.debug('Cleaned up old temp file:', file);
            }
        }
    } catch (error) {
        logger.error('Cleanup old files error:', error);
    }
};

// Schedule cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

module.exports = {
    upload,
    uploadConfigs,
    createUploadMiddleware,
    processImage,
    validateFile,
    scanFile,
    cleanupTempFiles,
    fileUtils,
    fileTypes,
    generateFileName
};