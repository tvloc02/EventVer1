const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Recipient Information
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientType: {
        type: String,
        enum: ['user', 'group', 'role', 'all'],
        default: 'user'
    },
    recipientGroups: [{
        type: String,
        enum: ['students', 'organizers', 'moderators', 'admins', 'faculty']
    }],

    // Sender Information
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    senderType: {
        type: String,
        enum: ['user', 'system', 'auto'],
        default: 'system'
    },

    // Notification Content
    type: {
        type: String,
        enum: [
            'event_reminder',
            'event_update',
            'event_cancelled',
            'event_published',
            'registration_confirmed',
            'registration_approved',
            'registration_rejected',
            'waitlist_promotion',
            'check_in_reminder',
            'certificate_ready',
            'feedback_request',
            'system_announcement',
            'account_update',
            'security_alert',
            'payment_confirmed',
            'payment_failed',
            'deadline_reminder'
        ],
        required: true
    },

    title: {
        type: String,
        required: true,
        maxlength: 200
    },

    message: {
        type: String,
        required: true,
        maxlength: 1000
    },

    shortMessage: {
        type: String,
        maxlength: 100
    },

    // Rich Content
    content: {
        html: String,
        markdown: String,
        attachments: [{
            name: String,
            url: String,
            type: String,
            size: Number
        }],
        images: [{
            url: String,
            alt: String,
            caption: String
        }],
        actions: [{
            label: String,
            url: String,
            type: {
                type: String,
                enum: ['link', 'button', 'modal']
            },
            style: {
                type: String,
                enum: ['primary', 'secondary', 'success', 'warning', 'danger']
            }
        }]
    },

    // Related Entities
    relatedEvent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    relatedRegistration: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration'
    },
    relatedCertificate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    },
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Delivery Channels
    channels: {
        inApp: {
            enabled: {
                type: Boolean,
                default: true
            },
            delivered: {
                type: Boolean,
                default: false
            },
            deliveredAt: Date,
            read: {
                type: Boolean,
                default: false
            },
            readAt: Date
        },
        email: {
            enabled: {
                type: Boolean,
                default: false
            },
            delivered: {
                type: Boolean,
                default: false
            },
            deliveredAt: Date,
            opened: {
                type: Boolean,
                default: false
            },
            openedAt: Date,
            clicked: {
                type: Boolean,
                default: false
            },
            clickedAt: Date,
            bounced: {
                type: Boolean,
                default: false
            },
            messageId: String
        },
        push: {
            enabled: {
                type: Boolean,
                default: false
            },
            delivered: {
                type: Boolean,
                default: false
            },
            deliveredAt: Date,
            clicked: {
                type: Boolean,
                default: false
            },
            clickedAt: Date,
            deviceTokens: [String]
        },
        sms: {
            enabled: {
                type: Boolean,
                default: false
            },
            delivered: {
                type: Boolean,
                default: false
            },
            deliveredAt: Date,
            messageId: String,
            phoneNumber: String
        }
    },

    // Priority and Urgency
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    urgency: {
        type: String,
        enum: ['background', 'normal', 'critical'],
        default: 'normal'
    },

    // Scheduling
    scheduledFor: {
        type: Date
    },

    deliveredAt: {
        type: Date
    },

    expiresAt: {
        type: Date
    },

    // Status and Tracking
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'sending', 'sent', 'delivered', 'failed', 'cancelled'],
        default: 'draft'
    },

    // Interaction Tracking
    interactions: {
        views: {
            type: Number,
            default: 0
        },
        clicks: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        },
        replies: {
            type: Number,
            default: 0
        }
    },

    // User Actions
    userActions: [{
        action: {
            type: String,
            enum: ['viewed', 'clicked', 'shared', 'replied', 'dismissed', 'starred']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        data: mongoose.Schema.Types.Mixed
    }],

    // Template Information
    template: {
        id: String,
        name: String,
        version: String
    },

    // Personalization
    personalization: {
        variables: mongoose.Schema.Types.Mixed,
        locale: {
            type: String,
            default: 'vi'
        },
        timezone: {
            type: String,
            default: 'Asia/Ho_Chi_Minh'
        }
    },

    // Categorization
    category: {
        type: String,
        enum: ['events', 'account', 'system', 'marketing', 'support', 'security'],
        default: 'events'
    },

    tags: [String],

    // Batch Information
    batchId: {
        type: String
    },

    campaign: {
        id: String,
        name: String,
        type: String
    },

    // Error Handling
    errors: [{
        channel: {
            type: String,
            enum: ['inApp', 'email', 'push', 'sms']
        },
        error: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        retryCount: {
            type: Number,
            default: 0
        }
    }],

    retryCount: {
        type: Number,
        default: 0
    },

    maxRetries: {
        type: Number,
        default: 3
    },

    // Metadata
    metadata: {
        source: String,
        version: String,
        environment: String,
        userAgent: String,
        ipAddress: String,
        customFields: mongoose.Schema.Types.Mixed
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ 'channels.inApp.read': 1 });
notificationSchema.index({ relatedEvent: 1 });
notificationSchema.index({ batchId: 1 });
notificationSchema.index({ category: 1 });

// Pre-save middleware
notificationSchema.pre('save', function(next) {
    // Set shortMessage if not provided
    if (!this.shortMessage && this.message) {
        this.shortMessage = this.message.length > 100
            ? this.message.substring(0, 97) + '...'
            : this.message;
    }

    // Set default expiry (30 days for most notifications)
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    next();
});

// Instance methods
notificationSchema.methods.markAsRead = function() {
    this.channels.inApp.read = true;
    this.channels.inApp.readAt = new Date();
    this.interactions.views += 1;

    this.userActions.push({
        action: 'viewed',
        timestamp: new Date()
    });

    return this.save();
};

notificationSchema.methods.markAsClicked = function(actionData) {
    this.interactions.clicks += 1;

    this.userActions.push({
        action: 'clicked',
        timestamp: new Date(),
        data: actionData
    });

    return this.save();
};

notificationSchema.methods.dismiss = function() {
    this.userActions.push({
        action: 'dismissed',
        timestamp: new Date()
    });

    return this.save();
};

notificationSchema.methods.star = function() {
    this.userActions.push({
        action: 'starred',
        timestamp: new Date()
    });

    return this.save();
};

notificationSchema.methods.retry = function() {
    if (this.retryCount < this.maxRetries) {
        this.retryCount += 1;
        this.status = 'scheduled';
        this.scheduledFor = new Date(Date.now() + (this.retryCount * 5 * 60 * 1000)); // Exponential backoff
        return this.save();
    }

    throw new Error('Maximum retry attempts reached');
};

notificationSchema.methods.cancel = function() {
    this.status = 'cancelled';
    return this.save();
};

notificationSchema.methods.isExpired = function() {
    return this.expiresAt && this.expiresAt < new Date();
};

notificationSchema.methods.canRetry = function() {
    return this.retryCount < this.maxRetries &&
        this.status === 'failed' &&
        !this.isExpired();
};

// Static methods
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
    const query = {
        recipient: userId,
        status: { $in: ['sent', 'delivered'] }
    };

    if (options.unreadOnly) {
        query['channels.inApp.read'] = false;
    }

    if (options.category) {
        query.category = options.category;
    }

    if (options.type) {
        query.type = options.type;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    return this.find(query)
        .populate('sender', 'profile.fullName profile.avatar')
        .populate('relatedEvent', 'title slug images.banner')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

notificationSchema.statics.getUnreadCount = function(userId) {
    return this.countDocuments({
        recipient: userId,
        'channels.inApp.read': false,
        status: { $in: ['sent', 'delivered'] }
    });
};

notificationSchema.statics.markAllAsRead = function(userId) {
    return this.updateMany(
        {
            recipient: userId,
            'channels.inApp.read': false
        },
        {
            $set: {
                'channels.inApp.read': true,
                'channels.inApp.readAt': new Date()
            },
            $inc: {
                'interactions.views': 1
            }
        }
    );
};

notificationSchema.statics.createEventNotification = async function(eventId, type, recipients, content) {
    const notifications = recipients.map(recipient => ({
        recipient: recipient._id,
        type,
        title: content.title,
        message: content.message,
        relatedEvent: eventId,
        channels: {
            inApp: { enabled: true },
            email: { enabled: recipient.preferences?.notifications?.email !== false },
            push: { enabled: recipient.preferences?.notifications?.push !== false }
        },
        category: 'events',
        personalization: {
            variables: {
                firstName: recipient.profile.firstName,
                eventTitle: content.eventTitle,
                ...content.variables
            },
            locale: recipient.preferences?.language || 'vi',
            timezone: recipient.preferences?.timezone || 'Asia/Ho_Chi_Minh'
        }
    }));

    return this.insertMany(notifications);
};

notificationSchema.statics.createSystemNotification = async function(content, recipients = 'all') {
    const notification = {
        recipientType: Array.isArray(recipients) ? 'user' : 'all',
        type: 'system_announcement',
        title: content.title,
        message: content.message,
        channels: {
            inApp: { enabled: true },
            email: { enabled: content.sendEmail !== false }
        },
        category: 'system',
        priority: content.priority || 'normal'
    };

    if (Array.isArray(recipients)) {
        const notifications = recipients.map(recipientId => ({
            ...notification,
            recipient: recipientId
        }));
        return this.insertMany(notifications);
    }

    return this.create(notification);
};

notificationSchema.statics.getNotificationStats = async function(filters = {}) {
    const matchStage = {};

    if (filters.startDate && filters.endDate) {
        matchStage.createdAt = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate)
        };
    }

    if (filters.type) matchStage.type = filters.type;
    if (filters.category) matchStage.category = filters.category;

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalNotifications: { $sum: 1 },
                delivered: {
                    $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
                },
                failed: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                read: {
                    $sum: { $cond: ['$channels.inApp.read', 1, 0] }
                },
                clicked: {
                    $sum: '$interactions.clicks'
                },
                avgDeliveryTime: {
                    $avg: {
                        $subtract: ['$deliveredAt', '$createdAt']
                    }
                },
                byType: {
                    $push: {
                        type: '$type',
                        count: 1
                    }
                },
                byChannel: {
                    $push: {
                        inApp: { $cond: ['$channels.inApp.enabled', 1, 0] },
                        email: { $cond: ['$channels.email.enabled', 1, 0] },
                        push: { $cond: ['$channels.push.enabled', 1, 0] },
                        sms: { $cond: ['$channels.sms.enabled', 1, 0] }
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalNotifications: 0,
        delivered: 0,
        failed: 0,
        read: 0,
        clicked: 0,
        avgDeliveryTime: 0,
        byType: [],
        byChannel: []
    };
};

notificationSchema.statics.cleanupExpired = function() {
    return this.deleteMany({
        expiresAt: { $lt: new Date() },
        status: { $in: ['delivered', 'failed'] }
    });
};

module.exports = mongoose.model('Notification', notificationSchema);