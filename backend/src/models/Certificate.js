const mongoose = require('mongoose');
const crypto = require('crypto');

const certificateSchema = new mongoose.Schema({
    certificateId: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    registration: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true
    },

    // Certificate Details
    type: {
        type: String,
        enum: ['participation', 'completion', 'achievement', 'excellence'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },

    // Recipient Information
    recipientName: {
        type: String,
        required: true
    },
    recipientEmail: {
        type: String,
        required: true
    },
    recipientId: {
        type: String // Student ID
    },

    // Event Information
    eventTitle: {
        type: String,
        required: true
    },
    eventDate: {
        type: Date,
        required: true
    },
    eventDuration: {
        type: Number // in hours
    },
    eventLocation: {
        type: String
    },
    eventOrganizer: {
        type: String
    },

    // Certificate Content
    template: {
        type: String,
        default: 'default'
    },
    customContent: {
        header: String,
        body: String,
        footer: String
    },
    skills: [String],
    competencies: [String],
    trainingPoints: {
        type: Number,
        default: 0
    },
    grade: {
        type: String,
        enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Pass', 'Fail']
    },
    score: {
        type: Number,
        min: 0,
        max: 100
    },

    // Verification
    verificationCode: {
        type: String,
        required: true,
        unique: true
    },
    qrCode: {
        type: String
    },
    digitalSignature: {
        type: String
    },

    // File Information
    fileUrl: {
        type: String
    },
    fileName: {
        type: String
    },
    fileSize: {
        type: Number
    },
    fileMimeType: {
        type: String,
        default: 'application/pdf'
    },

    // Issuer Information
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    issuedDate: {
        type: Date,
        default: Date.now
    },
    issuerName: {
        type: String,
        required: true
    },
    issuerTitle: {
        type: String
    },
    issuerSignature: {
        type: String
    },

    // Organization
    organization: {
        name: {
            type: String,
            required: true
        },
        logo: String,
        address: String,
        website: String,
        contact: {
            email: String,
            phone: String
        }
    },

    // Status and Tracking
    status: {
        type: String,
        enum: ['draft', 'issued', 'revoked', 'expired'],
        default: 'issued'
    },
    expiryDate: {
        type: Date
    },
    revokedDate: {
        type: Date
    },
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokedReason: {
        type: String
    },

    // Analytics
    viewCount: {
        type: Number,
        default: 0
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    lastViewed: {
        type: Date
    },
    lastDownloaded: {
        type: Date
    },
    sharedCount: {
        type: Number,
        default: 0
    },

    // Blockchain Integration
    blockchainHash: {
        type: String
    },
    blockchainTxId: {
        type: String
    },

    // LinkedIn Integration
    linkedInCertificateId: {
        type: String
    },
    linkedInPublishedAt: {
        type: Date
    },

    // Metadata
    metadata: {
        version: {
            type: String,
            default: '1.0'
        },
        generatedAt: {
            type: Date,
            default: Date.now
        },
        template_version: String,
        custom_fields: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
certificateSchema.index({ certificateId: 1 });
certificateSchema.index({ verificationCode: 1 });
certificateSchema.index({ user: 1, event: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ issuedDate: -1 });
certificateSchema.index({ type: 1 });

// Pre-save middleware
certificateSchema.pre('save', async function(next) {
    if (!this.certificateId) {
        this.certificateId = `CERT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    if (!this.verificationCode) {
        this.verificationCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    next();
});

// Instance methods
certificateSchema.methods.generateQRCode = async function() {
    const QRCode = require('qrcode');
    const verificationUrl = `${process.env.FRONTEND_URL}/certificates/verify/${this.verificationCode}`;

    try {
        this.qrCode = await QRCode.toDataURL(verificationUrl);
        return this.qrCode;
    } catch (error) {
        throw new Error('Failed to generate QR code');
    }
};

certificateSchema.methods.revoke = function(revokedBy, reason) {
    this.status = 'revoked';
    this.revokedDate = new Date();
    this.revokedBy = revokedBy;
    this.revokedReason = reason;
    return this.save();
};

certificateSchema.methods.incrementView = function() {
    this.viewCount += 1;
    this.lastViewed = new Date();
    return this.save();
};

certificateSchema.methods.incrementDownload = function() {
    this.downloadCount += 1;
    this.lastDownloaded = new Date();
    return this.save();
};

certificateSchema.methods.isValid = function() {
    if (this.status === 'revoked' || this.status === 'expired') {
        return false;
    }

    if (this.expiryDate && this.expiryDate < new Date()) {
        return false;
    }

    return true;
};

// Static methods
certificateSchema.statics.findByVerificationCode = function(code) {
    return this.findOne({ verificationCode: code.toUpperCase() })
        .populate('user', 'profile.fullName profile.avatar email')
        .populate('event', 'title slug images.banner')
        .populate('issuedBy', 'profile.fullName profile.avatar');
};

certificateSchema.statics.findByCertificateId = function(certId) {
    return this.findOne({ certificateId: certId })
        .populate('user', 'profile.fullName profile.avatar email')
        .populate('event', 'title slug images.banner')
        .populate('issuedBy', 'profile.fullName profile.avatar');
};

certificateSchema.statics.getUserCertificates = function(userId, options = {}) {
    const query = { user: userId, status: { $ne: 'revoked' } };

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query)
        .populate('event', 'title slug images.banner category')
        .populate('event.category', 'name color')
        .sort({ issuedDate: -1 });
};

certificateSchema.statics.getEventCertificates = function(eventId, options = {}) {
    const query = { event: eventId };

    if (options.status) {
        query.status = options.status;
    }

    if (options.type) {
        query.type = options.type;
    }

    return this.find(query)
        .populate('user', 'profile.fullName profile.avatar email student.studentId')
        .sort({ issuedDate: -1 });
};

certificateSchema.statics.getCertificateStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.eventId) matchStage.event = mongoose.Types.ObjectId(filters.eventId);
    if (filters.userId) matchStage.user = mongoose.Types.ObjectId(filters.userId);
    if (filters.startDate) matchStage.issuedDate = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
        matchStage.issuedDate = {
            ...matchStage.issuedDate,
            $lte: new Date(filters.endDate)
        };
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalCertificates: { $sum: 1 },
                totalViews: { $sum: '$viewCount' },
                totalDownloads: { $sum: '$downloadCount' },
                byType: {
                    $push: {
                        type: '$type',
                        count: 1
                    }
                },
                byStatus: {
                    $push: {
                        status: '$status',
                        count: 1
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalCertificates: 0,
        totalViews: 0,
        totalDownloads: 0,
        byType: [],
        byStatus: []
    };
};

module.exports = mongoose.model('Certificate', certificateSchema);