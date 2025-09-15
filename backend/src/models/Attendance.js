const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Check-in Information
    checkIn: {
        timestamp: {
            type: Date,
            required: true
        },
        method: {
            type: String,
            enum: ['qr_code', 'manual', 'nfc', 'mobile_app', 'facial_recognition'],
            default: 'manual'
        },
        location: {
            latitude: Number,
            longitude: Number,
            address: String,
            venue: String
        },
        deviceInfo: {
            userAgent: String,
            ipAddress: String,
            platform: String,
            deviceId: String
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        qrCode: String,
        notes: String
    },

    // Check-out Information
    checkOut: {
        timestamp: Date,
        method: {
            type: String,
            enum: ['qr_code', 'manual', 'nfc', 'mobile_app', 'automatic'],
            default: 'manual'
        },
        location: {
            latitude: Number,
            longitude: Number,
            address: String,
            venue: String
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String
    },

    // Session Attendance
    sessions: [{
        sessionId: String,
        sessionTitle: String,
        checkIn: {
            timestamp: Date,
            method: String,
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        checkOut: {
            timestamp: Date,
            method: String,
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        duration: Number, // in minutes
        attendanceRate: Number, // percentage
        notes: String
    }],

    // Overall Attendance
    totalDuration: {
        type: Number, // in minutes
        default: 0
    },
    expectedDuration: {
        type: Number, // in minutes
        default: 0
    },
    attendanceRate: {
        type: Number, // percentage
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'early_leave', 'partial'],
        default: 'present'
    },

    // Late/Early Leave Information
    lateArrival: {
        isLate: {
            type: Boolean,
            default: false
        },
        minutesLate: {
            type: Number,
            default: 0
        },
        acceptedByOrganizer: {
            type: Boolean,
            default: false
        }
    },

    earlyLeave: {
        isEarlyLeave: {
            type: Boolean,
            default: false
        },
        minutesEarly: {
            type: Number,
            default: 0
        },
        reason: String,
        acceptedByOrganizer: {
            type: Boolean,
            default: false
        }
    },

    // Additional Information
    accompaniedBy: [{
        name: String,
        relationship: String,
        contactInfo: String
    }],

    specialNeeds: {
        hasSpecialNeeds: {
            type: Boolean,
            default: false
        },
        needs: [String],
        accommodations: [String]
    },

    // Feedback and Rating
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        submittedAt: Date
    },

    // Certificate Eligibility
    certificateEligible: {
        type: Boolean,
        default: false
    },
    certificateEligibilityReason: String,

    // Analytics and Tracking
    viewedMaterials: [{
        materialId: String,
        materialName: String,
        viewedAt: Date,
        duration: Number
    }],

    participationScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    engagementMetrics: {
        questionsAsked: {
            type: Number,
            default: 0
        },
        pollsParticipated: {
            type: Number,
            default: 0
        },
        chatMessages: {
            type: Number,
            default: 0
        },
        networkingConnections: {
            type: Number,
            default: 0
        }
    },

    // Verification and Security
    verified: {
        type: Boolean,
        default: false
    },
    verificationMethod: {
        type: String,
        enum: ['qr_code', 'nfc', 'facial_recognition', 'manual', 'biometric']
    },
    verificationScore: {
        type: Number,
        min: 0,
        max: 100
    },

    // Flags and Issues
    flags: [{
        type: {
            type: String,
            enum: ['suspicious_activity', 'duplicate_checkin', 'location_mismatch', 'time_anomaly', 'device_mismatch']
        },
        description: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        resolved: {
            type: Boolean,
            default: false
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Metadata
    metadata: {
        source: {
            type: String,
            enum: ['web', 'mobile', 'kiosk', 'admin'],
            default: 'web'
        },
        version: String,
        timezone: String,
        weather: {
            temperature: Number,
            condition: String
        }
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
attendanceSchema.index({ event: 1, user: 1 }, { unique: true });
attendanceSchema.index({ registration: 1 });
attendanceSchema.index({ 'checkIn.timestamp': 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ attendanceRate: 1 });
attendanceSchema.index({ certificateEligible: 1 });

// Pre-save middleware
attendanceSchema.pre('save', function(next) {
    // Calculate total duration
    if (this.checkIn.timestamp && this.checkOut.timestamp) {
        this.totalDuration = Math.round((this.checkOut.timestamp - this.checkIn.timestamp) / (1000 * 60));
    }

    // Calculate attendance rate
    if (this.totalDuration && this.expectedDuration) {
        this.attendanceRate = Math.round((this.totalDuration / this.expectedDuration) * 100);
    }

    // Determine status based on attendance
    if (this.attendanceRate >= 90) {
        this.status = 'present';
        this.certificateEligible = true;
    } else if (this.attendanceRate >= 70) {
        this.status = 'partial';
        this.certificateEligible = this.attendanceRate >= 80;
    } else if (this.attendanceRate < 70 && this.attendanceRate > 0) {
        this.status = 'partial';
        this.certificateEligible = false;
    } else {
        this.status = 'absent';
        this.certificateEligible = false;
    }

    // Check for late arrival
    if (this.checkIn.timestamp && this.event.schedule) {
        const eventStartTime = new Date(this.event.schedule.startDate);
        const checkInTime = new Date(this.checkIn.timestamp);
        const timeDifference = checkInTime - eventStartTime;

        if (timeDifference > 15 * 60 * 1000) { // 15 minutes grace period
            this.lateArrival.isLate = true;
            this.lateArrival.minutesLate = Math.round(timeDifference / (1000 * 60));
        }
    }

    next();
});

// Instance methods
attendanceSchema.methods.checkOut = function(checkOutData) {
    this.checkOut = {
        timestamp: new Date(),
        method: checkOutData.method || 'manual',
        location: checkOutData.location,
        verifiedBy: checkOutData.verifiedBy,
        notes: checkOutData.notes
    };

    return this.save();
};

attendanceSchema.methods.addSession = function(sessionData) {
    this.sessions.push(sessionData);
    return this.save();
};

attendanceSchema.methods.updateEngagement = function(metrics) {
    Object.assign(this.engagementMetrics, metrics);

    // Calculate participation score
    const maxScore = 100;
    let score = 0;

    score += Math.min(this.engagementMetrics.questionsAsked * 10, 30);
    score += Math.min(this.engagementMetrics.pollsParticipated * 5, 20);
    score += Math.min(this.engagementMetrics.chatMessages * 2, 20);
    score += Math.min(this.engagementMetrics.networkingConnections * 5, 30);

    this.participationScore = Math.min(score, maxScore);

    return this.save();
};

attendanceSchema.methods.addFlag = function(flagData) {
    this.flags.push({
        type: flagData.type,
        description: flagData.description,
        severity: flagData.severity || 'medium'
    });

    return this.save();
};

attendanceSchema.methods.resolveFlag = function(flagId, resolvedBy) {
    const flag = this.flags.id(flagId);
    if (flag) {
        flag.resolved = true;
        flag.resolvedBy = resolvedBy;
        flag.resolvedAt = new Date();
    }

    return this.save();
};

// Static methods
attendanceSchema.statics.getEventAttendance = function(eventId, options = {}) {
    const query = { event: eventId };

    if (options.status) {
        query.status = options.status;
    }

    return this.find(query)
        .populate('user', 'profile.fullName profile.avatar email student.studentId')
        .populate('registration', 'registrationNumber')
        .sort({ 'checkIn.timestamp': -1 });
};

attendanceSchema.statics.getUserAttendance = function(userId, options = {}) {
    const query = { user: userId };

    if (options.eventId) {
        query.event = options.eventId;
    }

    if (options.startDate && options.endDate) {
        query['checkIn.timestamp'] = {
            $gte: new Date(options.startDate),
            $lte: new Date(options.endDate)
        };
    }

    return this.find(query)
        .populate('event', 'title slug images.banner schedule location')
        .sort({ 'checkIn.timestamp': -1 });
};

attendanceSchema.statics.getAttendanceStats = async function(eventId) {
    const stats = await this.aggregate([
        { $match: { event: mongoose.Types.ObjectId(eventId) } },
        {
            $group: {
                _id: null,
                totalAttendees: { $sum: 1 },
                averageAttendanceRate: { $avg: '$attendanceRate' },
                certificateEligible: {
                    $sum: { $cond: ['$certificateEligible', 1, 0] }
                },
                byStatus: {
                    $push: {
                        status: '$status',
                        count: 1
                    }
                },
                averageDuration: { $avg: '$totalDuration' },
                totalEngagement: {
                    $sum: {
                        $add: [
                            '$engagementMetrics.questionsAsked',
                            '$engagementMetrics.pollsParticipated',
                            '$engagementMetrics.chatMessages'
                        ]
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalAttendees: 0,
        averageAttendanceRate: 0,
        certificateEligible: 0,
        byStatus: [],
        averageDuration: 0,
        totalEngagement: 0
    };
};

attendanceSchema.statics.findDuplicateCheckIns = function(eventId, timeWindow = 5) {
    // Find potential duplicate check-ins within the time window (minutes)
    return this.aggregate([
        { $match: { event: mongoose.Types.ObjectId(eventId) } },
        {
            $group: {
                _id: {
                    user: '$user',
                    timeGroup: {
                        $dateToString: {
                            format: '%Y-%m-%d %H:%M',
                            date: {
                                $dateAdd: {
                                    startDate: '$checkIn.timestamp',
                                    unit: 'minute',
                                    amount: { $mod: [{ $minute: '$checkIn.timestamp' }, timeWindow] }
                                }
                            }
                        }
                    }
                },
                count: { $sum: 1 },
                attendances: { $push: '$$ROOT' }
            }
        },
        { $match: { count: { $gt: 1 } } }
    ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);