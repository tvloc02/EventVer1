const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    // Core References
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Registration Details
    registrationNumber: {
        type: String,
        unique: true,
        uppercase: true
    },
    registrationType: {
        type: String,
        enum: ['individual', 'group', 'waitlist'],
        default: 'individual'
    },
    groupInfo: {
        groupName: String,
        groupSize: Number,
        groupLeader: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        members: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            role: {
                type: String,
                enum: ['leader', 'member'],
                default: 'member'
            }
        }]
    },

    // Status and Approval
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'waitlist', 'attended', 'no_show'],
        default: 'pending'
    },
    approvalStatus: {
        type: String,
        enum: ['auto_approved', 'manual_approved', 'rejected', 'pending_review'],
        default: 'auto_approved'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,

    // Custom Fields Data
    customFieldsData: [{
        fieldName: String,
        fieldType: String,
        value: mongoose.Schema.Types.Mixed
    }],

    // Payment Information
    payment: {
        required: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        amount: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'VND'
        },
        discountApplied: {
            type: Number,
            default: 0
        },
        couponCode: String,
        finalAmount: Number,
        paymentMethod: {
            type: String,
            enum: ['vnpay', 'momo', 'banking', 'cash', 'free']
        },
        transactionId: String,
        paymentDate: Date,
        refundAmount: Number,
        refundDate: Date,
        refundReason: String
    },

    // Attendance Tracking
    attendance: {
        checkedIn: {
            type: Boolean,
            default: false
        },
        checkInTime: Date,
        checkInMethod: {
            type: String,
            enum: ['qr_code', 'manual', 'nfc', 'mobile_app']
        },
        checkedOut: {
            type: Boolean,
            default: false
        },
        checkOutTime: Date,
        attendanceDuration: Number, // in minutes
        sessionsAttended: [{
            sessionId: String,
            sessionTitle: String,
            checkInTime: Date,
            checkOutTime: Date,
            duration: Number
        }],
        attendanceRate: {
            type: Number,
            default: 0
        }
    },

    // Check-in/Check-out Details
    checkIn: {
        qrCode: String,
        qrCodeExpires: Date,
        location: {
            latitude: Number,
            longitude: Number,
            address: String
        },
        deviceInfo: {
            userAgent: String,
            ipAddress: String,
            platform: String
        }
    },

    // Waitlist Information
    waitlist: {
        position: Number,
        joinedAt: Date,
        notifiedAt: Date,
        expiresAt: Date,
        autoPromote: {
            type: Boolean,
            default: true
        }
    },

    // Communication Preferences
    notifications: {
        email: {
            type: Boolean,
            default: true
        },
        sms: {
            type: Boolean,
            default: false
        },
        push: {
            type: Boolean,
            default: true
        },
        reminders: {
            type: Boolean,
            default: true
        }
    },

    // Event Experience
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        submitted: {
            type: Boolean,
            default: false
        },
        submittedAt: Date,
        helpful: {
            type: Number,
            default: 0
        },
        categories: {
            content: Number,
            organization: Number,
            venue: Number,
            speaker: Number,
            networking: Number
        }
    },

    // Certificate and Recognition
    certificate: {
        eligible: {
            type: Boolean,
            default: false
        },
        issued: {
            type: Boolean,
            default: false
        },
        certificateId: String,
        issuedAt: Date,
        downloadCount: {
            type: Number,
            default: 0
        },
        lastDownloaded: Date,
        type: {
            type: String,
            enum: ['participation', 'completion', 'achievement']
        },
        verificationCode: String
    },

    // Special Accommodations
    accommodations: {
        dietary: [String],
        accessibility: [String],
        language: String,
        other: String
    },

    // Emergency Contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },

    // Registration Source
    source: {
        channel: {
            type: String,
            enum: ['web', 'mobile', 'admin', 'import', 'api'],
            default: 'web'
        },
        referrer: String,
        campaign: String,
        medium: String,
        utmParams: {
            source: String,
            medium: String,
            campaign: String,
            term: String,
            content: String
        }
    },

    // Timestamps and Tracking
    registrationDate: {
        type: Date,
        default: Date.now
    },
    lastModified: {
        type: Date,
        default: Date.now
    },
    cancelledAt: Date,
    cancellationReason: String,

    // Metadata
    notes: String,
    internalNotes: String,
    tags: [String],

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for better query performance
registrationSchema.index({ event: 1, user: 1 }, { unique: true });
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ user: 1, status: 1 });
registrationSchema.index({ registrationNumber: 1 });
registrationSchema.index({ status: 1 });
registrationSchema.index({ 'payment.status': 1 });
registrationSchema.index({ 'attendance.checkedIn': 1 });
registrationSchema.index({ registrationDate: -1 });
registrationSchema.index({ 'waitlist.position': 1 });

// Virtuals
registrationSchema.virtual('isActive').get(function() {
    return ['approved', 'attended'].includes(this.status);
});

registrationSchema.virtual('isPaid').get(function() {
    return this.payment.status === 'completed' || !this.payment.required;
});

registrationSchema.virtual('canCheckIn').get(function() {
    return this.status === 'approved' && this.isPaid && !this.attendance.checkedIn;
});

registrationSchema.virtual('daysUntilEvent').get(function() {
    if (!this.event || !this.event.schedule) return null;
    const now = new Date();
    const eventStart = new Date(this.event.schedule.startDate);
    const diffTime = eventStart - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
registrationSchema.pre('save', async function(next) {
    // Generate unique registration number
    if (!this.registrationNumber) {
        const event = await mongoose.model('Event').findById(this.event);
        if (event) {
            const prefix = event.eventCode || 'REG';
            const count = await this.constructor.countDocuments({ event: this.event });
            this.registrationNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
        }
    }

    // Generate QR code for check-in
    if (this.status === 'approved' && !this.checkIn.qrCode) {
        const crypto = require('crypto');
        this.checkIn.qrCode = crypto.randomBytes(16).toString('hex');
        this.checkIn.qrCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    // Update lastModified
    this.lastModified = new Date();

    // Calculate final payment amount
    if (this.payment.required) {
        this.payment.finalAmount = this.payment.amount - (this.payment.discountApplied || 0);
    }

    next();
});

// Instance methods
registrationSchema.methods.approve = async function(approvedBy) {
    this.status = 'approved';
    this.approvalStatus = 'manual_approved';
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();

    // Move from waitlist if applicable
    if (this.registrationType === 'waitlist') {
        this.registrationType = 'individual';
        await this.promoteFromWaitlist();
    }

    return this.save();
};

registrationSchema.methods.reject = async function(reason, rejectedBy) {
    this.status = 'rejected';
    this.approvalStatus = 'rejected';
    this.rejectionReason = reason;
    this.updatedBy = rejectedBy;
    return this.save();
};

registrationSchema.methods.cancel = async function(reason) {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancellationReason = reason;

    // Handle refund if payment was made
    if (this.payment.status === 'completed') {
        this.payment.status = 'refunded';
        this.payment.refundDate = new Date();
        this.payment.refundAmount = this.payment.finalAmount;
        this.payment.refundReason = reason;
    }

    return this.save();
};

registrationSchema.methods.checkIn = async function(method = 'manual', location = null) {
    this.attendance.checkedIn = true;
    this.attendance.checkInTime = new Date();
    this.attendance.checkInMethod = method;

    if (location) {
        this.checkIn.location = location;
    }

    this.status = 'attended';
    return this.save();
};

registrationSchema.methods.checkOut = async function() {
    if (!this.attendance.checkedIn) {
        throw new Error('Cannot check out without checking in first');
    }

    this.attendance.checkedOut = true;
    this.attendance.checkOutTime = new Date();

    // Calculate attendance duration
    const duration = (this.attendance.checkOutTime - this.attendance.checkInTime) / (1000 * 60);
    this.attendance.attendanceDuration = Math.round(duration);

    return this.save();
};

registrationSchema.methods.submitFeedback = async function(feedbackData) {
    this.feedback = {
        ...this.feedback.toObject(),
        ...feedbackData,
        submitted: true,
        submittedAt: new Date()
    };
    return this.save();
};

registrationSchema.methods.promoteFromWaitlist = async function() {
    if (this.registrationType !== 'waitlist') return false;

    // Check if there's space available
    const event = await mongoose.model('Event').findById(this.event);
    if (event.registration.currentParticipants >= event.registration.maxParticipants) {
        return false;
    }

    this.registrationType = 'individual';
    this.status = 'approved';
    this.waitlist = undefined;

    await this.save();

    // Update event participant count
    await event.incrementRegistrations();

    return true;
};

registrationSchema.methods.generateCertificate = async function() {
    if (!this.certificate.eligible) return false;

    const crypto = require('crypto');
    this.certificate.issued = true;
    this.certificate.issuedAt = new Date();
    this.certificate.certificateId = crypto.randomUUID();
    this.certificate.verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    return this.save();
};

// Static methods
registrationSchema.statics.findByRegistrationNumber = function(registrationNumber) {
    return this.findOne({ registrationNumber: registrationNumber.toUpperCase() });
};

registrationSchema.statics.findByQRCode = function(qrCode) {
    return this.findOne({
        'checkIn.qrCode': qrCode,
        'checkIn.qrCodeExpires': { $gt: new Date() }
    }).populate('user event');
};

registrationSchema.statics.getEventStatistics = async function(eventId) {
    const stats = await this.aggregate([
        { $match: { event: mongoose.Types.ObjectId(eventId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        cancelled: 0,
        attended: 0,
        waitlist: 0,
        no_show: 0
    };

    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });

    return result;
};

registrationSchema.statics.getWaitlistPosition = async function(eventId, userId) {
    const waitlistRegistrations = await this.find({
        event: eventId,
        registrationType: 'waitlist',
        status: 'waitlist'
    }).sort({ 'waitlist.joinedAt': 1 });

    const userRegistration = waitlistRegistrations.find(
        reg => reg.user.toString() === userId.toString()
    );

    return userRegistration ? waitlistRegistrations.indexOf(userRegistration) + 1 : null;
};

registrationSchema.statics.processWaitlistPromotions = async function(eventId) {
    const event = await mongoose.model('Event').findById(eventId);
    if (!event) return [];

    const availableSpots = event.registration.maxParticipants - event.registration.currentParticipants;
    if (availableSpots <= 0) return [];

    const waitlistRegistrations = await this.find({
        event: eventId,
        registrationType: 'waitlist',
        status: 'waitlist',
        'waitlist.autoPromote': true
    })
        .sort({ 'waitlist.joinedAt': 1 })
        .limit(availableSpots)
        .populate('user');

    const promoted = [];
    for (const registration of waitlistRegistrations) {
        const success = await registration.promoteFromWaitlist();
        if (success) {
            promoted.push(registration);
        }
    }

    return promoted;
};

module.exports = mongoose.model('Registration', registrationSchema);