const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    // Basic Information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: function() {
            return !this.oauth.google.id && !this.oauth.microsoft.id;
        },
        minlength: 6
    },

    // Personal Information
    profile: {
        firstName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        fullName: {
            type: String,
            trim: true
        },
        avatar: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            trim: true,
            match: [/^[0-9]{10,11}$/, 'Please enter a valid phone number']
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            default: 'other'
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: {
                type: String,
                default: 'Vietnam'
            }
        },
        bio: {
            type: String,
            maxlength: 500
        }
    },

    // Student Information
    student: {
        studentId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        faculty: {
            type: String,
            trim: true
        },
        department: {
            type: String,
            trim: true
        },
        major: {
            type: String,
            trim: true
        },
        year: {
            type: Number,
            min: 1,
            max: 6
        },
        gpa: {
            type: Number,
            min: 0,
            max: 4
        },
        enrollmentDate: {
            type: Date
        },
        graduationDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'graduated', 'dropped'],
            default: 'active'
        }
    },

    // Role and Permissions
    role: {
        type: String,
        enum: ['admin', 'moderator', 'organizer', 'student', 'guest'],
        default: 'student'
    },
    permissions: [{
        type: String,
        enum: [
            'manage_users',
            'manage_events',
            'create_events',
            'manage_registrations',
            'view_reports',
            'manage_certificates',
            'system_config'
        ]
    }],

    // OAuth Integration
    oauth: {
        google: {
            id: String,
            email: String,
            verified: {
                type: Boolean,
                default: false
            }
        },
        microsoft: {
            id: String,
            email: String,
            verified: {
                type: Boolean,
                default: false
            }
        },
        facebook: {
            id: String,
            email: String,
            verified: {
                type: Boolean,
                default: false
            }
        }
    },

    // Security
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    twoFactorAuth: {
        enabled: {
            type: Boolean,
            default: false
        },
        secret: String,
        backupCodes: [String]
    },

    // Activity
    lastLogin: Date,
    lastActivity: Date,
    loginHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        ip: String,
        userAgent: String,
        location: String
    }],

    // Preferences
    preferences: {
        language: {
            type: String,
            enum: ['vi', 'en'],
            default: 'vi'
        },
        timezone: {
            type: String,
            default: 'Asia/Ho_Chi_Minh'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            }
        },
        privacy: {
            showProfile: {
                type: Boolean,
                default: true
            },
            showEvents: {
                type: Boolean,
                default: true
            },
            allowMessages: {
                type: Boolean,
                default: true
            }
        }
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'banned'],
        default: 'active'
    },

    // Metadata
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

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'student.studentId': 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
    // Set full name
    if (this.profile.firstName && this.profile.lastName) {
        this.profile.fullName = `${this.profile.firstName} ${this.profile.lastName}`;
    }

    // Hash password if modified
    if (!this.isModified('password')) return next();

    if (this.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
    }

    next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateEmailVerificationToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return token;
};

userSchema.methods.generatePasswordResetToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    return token;
};

userSchema.methods.incrementLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1, loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
        };
    }

    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { lockUntil: 1, loginAttempts: 1 }
    });
};

userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    delete userObject.emailVerificationToken;
    delete userObject.emailVerificationExpires;
    delete userObject.twoFactorAuth.secret;
    delete userObject.twoFactorAuth.backupCodes;
    return userObject;
};

userSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

userSchema.methods.canAccessEvent = function(event) {
    if (this.role === 'admin') return true;
    if (this.role === 'moderator') return true;
    if (event.organizer && event.organizer.toString() === this._id.toString()) return true;
    return false;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
    return this.findOne({ username });
};

userSchema.statics.findByStudentId = function(studentId) {
    return this.findOne({ 'student.studentId': studentId });
};

module.exports = mongoose.model('User', userSchema);