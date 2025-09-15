// AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Actor Information
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actorType: {
        type: String,
        enum: ['user', 'system', 'api'],
        default: 'user'
    },
    actorIp: {
        type: String,
        trim: true
    },
    actorUserAgent: {
        type: String,
        trim: true
    },

    // Action Information
    action: {
        type: String,
        required: true,
        enum: [
            'create', 'update', 'delete', 'login', 'logout',
            'password_change', 'email_change', 'profile_update',
            'event_create', 'event_update', 'event_delete',
            'registration_create', 'registration_update', 'registration_cancel',
            'attendance_checkin', 'attendance_checkout',
            'certificate_issue', 'certificate_revoke',
            'notification_send', 'system_config_change',
            'permission_grant', 'permission_revoke',
            'data_export', 'data_import'
        ]
    },
    entity: {
        type: String,
        required: true,
        enum: [
            'User', 'Event', 'Registration', 'Attendance',
            'Certificate', 'Notification', 'Category',
            'SystemConfig', 'Permission', 'Report'
        ]
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    // Changes
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    diff: [mongoose.Schema.Types.Mixed],

    // Context
    description: {
        type: String,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['success', 'failure', 'pending'],
        default: 'success'
    },
    errorMessage: {
        type: String,
        maxlength: 1000
    },
    requestId: {
        type: String,
        trim: true
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Indexes
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static methods
auditLogSchema.statics.logAction = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to save audit log:', error);
    }
};

auditLogSchema.statics.getUserActions = function(userId, options = {}) {
    const query = { actor: userId };

    if (options.action) query.action = options.action;
    if (options.entity) query.entity = options.entity;
    if (options.startDate) query.createdAt = { $gte: new Date(options.startDate) };
    if (options.endDate) {
        query.createdAt = {
            ...query.createdAt,
            $lte: new Date(options.endDate)
        };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100);
};

auditLogSchema.statics.getEntityHistory = function(entity, entityId) {
    return this.find({ entity, entityId })
        .populate('actor', 'profile.fullName username')
        .sort({ createdAt: -1 });
};

auditLogSchema.statics.getSystemStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.startDate && filters.endDate) {
        matchStage.createdAt = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate)
        };
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalActions: { $sum: 1 },
                successful: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
                byAction: { $push: { k: '$action', v: 1 } },
                byEntity: { $push: { k: '$entity', v: 1 } }
            }
        },
        {
            $project: {
                totalActions: 1,
                successful: 1,
                failed: 1,
                byAction: { $arrayToObject: '$byAction' },
                byEntity: { $arrayToObject: '$byEntity' }
            }
        }
    ]);

    return stats[0] || {
        totalActions: 0,
        successful: 0,
        failed: 0,
        byAction: {},
        byEntity: {}
    };
};

auditLogSchema.statics.cleanupOldLogs = function(days = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.deleteMany({ createdAt: { $lt: cutoffDate } });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);