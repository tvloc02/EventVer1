const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    eventCode: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true
    },
    description: {
        short: {
            type: String,
            required: true,
            maxlength: 500
        },
        full: {
            type: String,
            required: true
        }
    },

    // Media
    images: {
        banner: {
            type: String,
            required: true
        },
        poster: String,
        gallery: [String]
    },

    // Schedule
    schedule: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        registrationStart: {
            type: Date,
            required: true
        },
        registrationEnd: {
            type: Date,
            required: true
        },
        timezone: {
            type: String,
            default: 'Asia/Ho_Chi_Minh'
        },
        duration: Number, // in minutes
        sessions: [{
            title: String,
            startTime: Date,
            endTime: Date,
            location: String,
            description: String,
            speaker: String,
            isRequired: {
                type: Boolean,
                default: false
            }
        }]
    },

    // Location
    location: {
        type: {
            type: String,
            enum: ['physical', 'online', 'hybrid'],
            required: true
        },
        venue: {
            name: String,
            address: {
                street: String,
                city: String,
                state: String,
                zipCode: String,
                country: String
            },
            coordinates: {
                latitude: Number,
                longitude: Number
            },
            capacity: Number,
            facilities: [String]
        },
        online: {
            platform: String,
            meetingLink: String,
            meetingId: String,
            password: String,
            instructions: String
        }
    },

    // Organization
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coOrganizers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    hostOrganization: {
        name: String,
        logo: String,
        website: String,
        contact: {
            email: String,
            phone: String
        }
    },
    sponsors: [{
        name: String,
        logo: String,
        website: String,
        level: {
            type: String,
            enum: ['platinum', 'gold', 'silver', 'bronze', 'partner']
        }
    }],

    // Category and Classification
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    tags: [String],
    eventType: {
        type: String,
        enum: ['workshop', 'seminar', 'conference', 'competition', 'social', 'career', 'academic', 'sports', 'volunteer', 'cultural'],
        required: true
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
        default: 'all-levels'
    },

    // Target Audience
    targetAudience: {
        faculties: [String],
        departments: [String],
        majors: [String],
        years: [Number],
        minGPA: Number,
        maxParticipants: Number,
        prerequisites: [String],
        restrictions: [String]
    },

    // Registration
    registration: {
        isOpen: {
            type: Boolean,
            default: true
        },
        requiresApproval: {
            type: Boolean,
            default: false
        },
        maxParticipants: {
            type: Number,
            required: true
        },
        currentParticipants: {
            type: Number,
            default: 0
        },
        waitlistEnabled: {
            type: Boolean,
            default: true
        },
        customFields: [{
            name: String,
            type: {
                type: String,
                enum: ['text', 'textarea', 'select', 'multiselect', 'file', 'checkbox', 'radio']
            },
            options: [String],
            required: {
                type: Boolean,
                default: false
            },
            placeholder: String,
            validation: String
        }],
        confirmationMessage: String
    },

    // Pricing
    pricing: {
        isFree: {
            type: Boolean,
            default: true
        },
        price: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'VND'
        },
        earlyBirdPrice: Number,
        earlyBirdDeadline: Date,
        groupDiscounts: [{
            minPeople: Number,
            discountPercent: Number
        }],
        coupons: [{
            code: String,
            discountType: {
                type: String,
                enum: ['percentage', 'fixed']
            },
            discountValue: Number,
            maxUses: Number,
            usedCount: {
                type: Number,
                default: 0
            },
            expiresAt: Date,
            isActive: {
                type: Boolean,
                default: true
            }
        }]
    },

    // Rewards and Recognition
    rewards: {
        trainingPoints: {
            type: Number,
            default: 0
        },
        certificateType: {
            type: String,
            enum: ['none', 'participation', 'completion', 'achievement'],
            default: 'none'
        },
        certificateTemplate: String,
        badges: [String],
        skills: [String],
        competencies: [String]
    },

    // Content and Materials
    content: {
        agenda: String,
        materials: [{
            title: String,
            type: {
                type: String,
                enum: ['pdf', 'video', 'link', 'image', 'document']
            },
            url: String,
            size: String,
            downloadable: {
                type: Boolean,
                default: true
            }
        }],
        speakers: [{
            name: String,
            title: String,
            bio: String,
            avatar: String,
            company: String,
            linkedin: String,
            twitter: String,
            website: String
        }],
        faqs: [{
            question: String,
            answer: String,
            order: Number
        }]
    },

    // Status and Settings
    status: {
        type: String,
        enum: ['draft', 'published', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'postponed'],
        default: 'draft'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'restricted'],
        default: 'public'
    },
    featured: {
        type: Boolean,
        default: false
    },
    allowWaitlist: {
        type: Boolean,
        default: true
    },
    sendReminders: {
        type: Boolean,
        default: true
    },
    enableQRCode: {
        type: Boolean,
        default: true
    },
    qrCode: String,

    // Statistics
    stats: {
        views: {
            type: Number,
            default: 0
        },
        registrations: {
            type: Number,
            default: 0
        },
        cancellations: {
            type: Number,
            default: 0
        },
        attendees: {
            type: Number,
            default: 0
        },
        completions: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        },
        totalRatings: {
            type: Number,
            default: 0
        }
    },

    // Social Features
    social: {
        allowComments: {
            type: Boolean,
            default: true
        },
        allowSharing: {
            type: Boolean,
            default: true
        },
        hashtag: String,
        socialLinks: {
            facebook: String,
            twitter: String,
            linkedin: String,
            instagram: String
        }
    },

    // Settings
    settings: {
        autoApprove: {
            type: Boolean,
            default: true
        },
        requirePayment: {
            type: Boolean,
            default: false
        },
        allowGuestRegistration: {
            type: Boolean,
            default: false
        },
        maxRegistrationsPerUser: {
            type: Number,
            default: 1
        },
        cancellationPolicy: String,
        refundPolicy: String,
        terms: String,
        privacy: String
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publishedAt: Date,
    archivedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
eventSchema.index({ title: 'text', 'description.short': 'text', 'description.full': 'text', tags: 'text' });
eventSchema.index({ slug: 1 });
eventSchema.index({ eventCode: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ visibility: 1 });
eventSchema.index({ featured: -1 });
eventSchema.index({ 'schedule.startDate': 1 });
eventSchema.index({ 'schedule.endDate': 1 });
eventSchema.index({ 'schedule.registrationStart': 1 });
eventSchema.index({ 'schedule.registrationEnd': 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ publishedAt: -1 });

// Virtuals
eventSchema.virtual('isRegistrationOpen').get(function() {
    const now = new Date();
    return this.registration.isOpen &&
        this.schedule.registrationStart <= now &&
        this.schedule.registrationEnd >= now &&
        this.status === 'published';
});

eventSchema.virtual('isFullyBooked').get(function() {
    return this.registration.currentParticipants >= this.registration.maxParticipants;
});

eventSchema.virtual('availableSpots').get(function() {
    return Math.max(0, this.registration.maxParticipants - this.registration.currentParticipants);
});

eventSchema.virtual('daysUntilStart').get(function() {
    const now = new Date();
    const diffTime = this.schedule.startDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

eventSchema.virtual('isUpcoming').get(function() {
    return this.schedule.startDate > new Date();
});

eventSchema.virtual('isOngoing').get(function() {
    const now = new Date();
    return this.schedule.startDate <= now && this.schedule.endDate >= now;
});

eventSchema.virtual('isPast').get(function() {
    return this.schedule.endDate < new Date();
});

// Pre-save middleware
eventSchema.pre('save', async function(next) {
    // Generate slug from title
    if (this.isModified('title')) {
        this.slug = this.title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Ensure unique slug
        const existingEvent = await this.constructor.findOne({
            slug: this.slug,
            _id: { $ne: this._id }
        });

        if (existingEvent) {
            this.slug = `${this.slug}-${Date.now()}`;
        }
    }

    // Generate event code
    if (!this.eventCode) {
        const prefix = this.eventType.toUpperCase().substring(0, 3);
        const timestamp = Date.now().toString().slice(-6);
        this.eventCode = `${prefix}${timestamp}`;
    }

    // Set published date
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    // Calculate duration
    if (this.schedule.startDate && this.schedule.endDate) {
        this.schedule.duration = Math.round((this.schedule.endDate - this.schedule.startDate) / (1000 * 60));
    }

    next();
});

// Instance methods
eventSchema.methods.incrementViews = function() {
    return this.updateOne({ $inc: { 'stats.views': 1 } });
};

eventSchema.methods.incrementRegistrations = function() {
    return this.updateOne({
        $inc: {
            'stats.registrations': 1,
            'registration.currentParticipants': 1
        }
    });
};

eventSchema.methods.decrementRegistrations = function() {
    return this.updateOne({
        $inc: {
            'stats.cancellations': 1,
            'registration.currentParticipants': -1
        }
    });
};

eventSchema.methods.canUserRegister = function(user) {
    if (!this.isRegistrationOpen) return false;
    if (this.isFullyBooked && !this.allowWaitlist) return false;

    // Check target audience restrictions
    if (this.targetAudience.faculties.length > 0 &&
        !this.targetAudience.faculties.includes(user.student.faculty)) {
        return false;
    }

    if (this.targetAudience.years.length > 0 &&
        !this.targetAudience.years.includes(user.student.year)) {
        return false;
    }

    if (this.targetAudience.minGPA &&
        user.student.gpa < this.targetAudience.minGPA) {
        return false;
    }

    return true;
};

eventSchema.methods.updateRating = async function(newRating) {
    const totalRatings = this.stats.totalRatings + 1;
    const currentTotal = this.stats.averageRating * this.stats.totalRatings;
    const newAverage = (currentTotal + newRating) / totalRatings;

    return this.updateOne({
        'stats.averageRating': Math.round(newAverage * 10) / 10,
        'stats.totalRatings': totalRatings
    });
};

// Static methods
eventSchema.statics.findBySlug = function(slug) {
    return this.findOne({ slug });
};

eventSchema.statics.findByEventCode = function(eventCode) {
    return this.findOne({ eventCode: eventCode.toUpperCase() });
};

eventSchema.statics.findUpcoming = function(limit = 10) {
    return this.find({
        'schedule.startDate': { $gt: new Date() },
        status: 'published',
        visibility: 'public'
    })
        .sort({ 'schedule.startDate': 1 })
        .limit(limit)
        .populate('organizer', 'profile.fullName profile.avatar')
        .populate('category', 'name color');
};

eventSchema.statics.findFeatured = function(limit = 5) {
    return this.find({
        featured: true,
        status: 'published',
        visibility: 'public'
    })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .populate('organizer', 'profile.fullName profile.avatar')
        .populate('category', 'name color');
};

eventSchema.statics.searchEvents = function(query, filters = {}) {
    const searchCriteria = {
        status: 'published',
        visibility: 'public'
    };

    if (query) {
        searchCriteria.$text = { $search: query };
    }

    if (filters.category) {
        searchCriteria.category = filters.category;
    }

    if (filters.eventType) {
        searchCriteria.eventType = filters.eventType;
    }

    if (filters.startDate && filters.endDate) {
        searchCriteria['schedule.startDate'] = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate)
        };
    }

    if (filters.location) {
        searchCriteria['location.type'] = filters.location;
    }

    if (filters.isFree !== undefined) {
        searchCriteria['pricing.isFree'] = filters.isFree;
    }

    return this.find(searchCriteria)
        .populate('organizer', 'profile.fullName profile.avatar')
        .populate('category', 'name color')
        .sort({ 'schedule.startDate': 1 });
};

module.exports = mongoose.model('Event', eventSchema);