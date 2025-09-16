// scripts/seedComplete.js - Tạo đầy đủ collections và dữ liệu
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Kết nối MongoDB
async function connectDB() {
    await mongoose.connect('mongodb://localhost:27017/StudentEventManagement', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Connected to MongoDB local');
}

// Định nghĩa tất cả schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: String,
    avatar: String,
    phone: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    bio: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'Vietnam' }
    },
    studentId: { type: String, unique: true, sparse: true },
    faculty: String,
    department: String,
    major: String,
    year: { type: Number, min: 1, max: 6 },
    gpa: { type: Number, min: 0, max: 4 },
    enrollmentDate: Date,
    graduationDate: Date,
    studentStatus: { type: String, enum: ['active', 'inactive', 'graduated', 'dropped'], default: 'active' },
    role: { type: String, enum: ['admin', 'moderator', 'organizer', 'student', 'guest'], default: 'student' },
    permissions: [String],
    oauth: {
        google: { id: String, email: String, verified: Boolean },
        microsoft: { id: String, email: String, verified: Boolean },
        facebook: { id: String, email: String, verified: Boolean }
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    lastLogin: Date,
    lastActivity: Date,
    preferences: {
        language: { type: String, enum: ['vi', 'en'], default: 'vi' },
        timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        }
    },
    status: { type: String, enum: ['active', 'inactive', 'suspended', 'banned'], default: 'active' }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: String,
    color: { type: String, default: '#1890ff' },
    icon: { type: String, default: 'CalendarOutlined' },
    image: String,
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    eventCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    eventCode: { type: String, unique: true, required: true },
    shortDescription: { type: String, required: true, maxlength: 500 },
    fullDescription: { type: String, required: true },
    bannerImage: { type: String, required: true },
    posterImage: String,
    galleryImages: [String],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    locationType: { type: String, enum: ['physical', 'online', 'hybrid'], required: true },
    venue: {
        name: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        latitude: Number,
        longitude: Number,
        capacity: Number,
        facilities: [String]
    },
    onlineLocation: {
        platform: String,
        meetingLink: String,
        meetingId: String,
        meetingPassword: String,
        instructions: String
    },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hostOrganization: {
        name: String,
        logo: String,
        website: String,
        email: String,
        phone: String
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    eventType: {
        type: String,
        enum: ['workshop', 'seminar', 'conference', 'competition', 'social', 'career', 'academic', 'sports', 'volunteer', 'cultural'],
        required: true
    },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all-levels'], default: 'all-levels' },
    tags: [String],
    targetAudience: {
        faculties: [String],
        departments: [String],
        majors: [String],
        years: [Number],
        minGpa: Number,
        prerequisites: [String],
        restrictions: [String]
    },
    registrationOpen: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: false },
    maxParticipants: { type: Number, required: true },
    currentParticipants: { type: Number, default: 0 },
    waitlistEnabled: { type: Boolean, default: true },
    customFields: [{
        name: String,
        type: String,
        required: Boolean,
        options: [String]
    }],
    confirmationMessage: String,
    isFree: { type: Boolean, default: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
    earlyBird: {
        price: Number,
        deadline: Date
    },
    groupDiscounts: [{
        minSize: Number,
        discount: Number
    }],
    coupons: [{
        code: String,
        discount: Number,
        validUntil: Date
    }],
    trainingPoints: { type: Number, default: 0 },
    certificate: {
        type: { type: String, enum: ['none', 'participation', 'completion', 'achievement'], default: 'none' },
        template: String
    },
    badges: [String],
    skills: [String],
    competencies: [String],
    agenda: String,
    materials: [{
        name: String,
        url: String,
        type: String
    }],
    speakers: [{
        name: String,
        title: String,
        bio: String,
        avatar: String,
        social: {
            linkedin: String,
            twitter: String,
            website: String
        }
    }],
    faqs: [{
        question: String,
        answer: String
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'postponed'],
        default: 'draft'
    },
    visibility: { type: String, enum: ['public', 'private', 'restricted'], default: 'public' },
    featured: { type: Boolean, default: false },
    settings: {
        allowWaitlist: { type: Boolean, default: true },
        sendReminders: { type: Boolean, default: true },
        enableQrCode: { type: Boolean, default: true },
        qrCode: String,
        allowComments: { type: Boolean, default: true },
        allowSharing: { type: Boolean, default: true },
        autoApprove: { type: Boolean, default: true },
        requirePayment: { type: Boolean, default: false },
        allowGuestRegistration: { type: Boolean, default: false },
        maxRegistrationsPerUser: { type: Number, default: 1 }
    },
    statistics: {
        viewsCount: { type: Number, default: 0 },
        registrationsCount: { type: Number, default: 0 },
        cancellationsCount: { type: Number, default: 0 },
        attendeesCount: { type: Number, default: 0 },
        completionsCount: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        totalRatings: { type: Number, default: 0 }
    },
    social: {
        hashtag: String,
        links: {
            facebook: String,
            twitter: String,
            linkedin: String,
            instagram: String
        }
    },
    policies: {
        cancellation: String,
        refund: String,
        terms: String,
        privacy: String
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: Date,
    archivedAt: Date
}, { timestamps: true });

const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    registrationNumber: { type: String, unique: true, required: true },
    registrationType: { type: String, enum: ['individual', 'group', 'waitlist'], default: 'individual' },
    group: {
        name: String,
        size: Number,
        leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'waitlist', 'attended', 'no_show'],
        default: 'pending'
    },
    approval: {
        status: { type: String, enum: ['auto_approved', 'manual_approved', 'rejected', 'pending_review'], default: 'auto_approved' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        rejectionReason: String
    },
    customFieldsData: { type: Map, of: mongoose.Schema.Types.Mixed },
    payment: {
        required: { type: Boolean, default: false },
        status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'pending' },
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'VND' },
        discountApplied: { type: Number, default: 0 },
        couponCode: String,
        finalAmount: Number,
        method: { type: String, enum: ['vnpay', 'momo', 'banking', 'cash', 'free'] },
        transactionId: String,
        paymentDate: Date,
        refund: {
            amount: Number,
            date: Date,
            reason: String
        }
    },
    attendance: {
        checkedIn: { type: Boolean, default: false },
        checkInTime: Date,
        checkInMethod: { type: String, enum: ['qr_code', 'manual', 'nfc', 'mobile_app'] },
        checkedOut: { type: Boolean, default: false },
        checkOutTime: Date,
        duration: Number,
        rate: { type: Number, default: 0 },
        checkInDetails: {
            qrCode: String,
            qrCodeExpires: Date,
            location: {
                latitude: Number,
                longitude: Number,
                address: String
            },
            device: {
                userAgent: String,
                ipAddress: String,
                platform: String
            }
        }
    },
    waitlist: {
        position: Number,
        joinedAt: Date,
        notifiedAt: Date,
        expiresAt: Date,
        autoPromote: { type: Boolean, default: true }
    },
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        reminders: { type: Boolean, default: true }
    },
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        review: String,
        submitted: { type: Boolean, default: false },
        submittedAt: Date,
        helpful: { type: Number, default: 0 },
        detailedRatings: {
            content: Number,
            organization: Number,
            venue: Number,
            speaker: Number,
            networking: Number
        }
    },
    certificate: {
        eligible: { type: Boolean, default: false },
        issued: { type: Boolean, default: false },
        certificateId: String,
        issuedAt: Date,
        downloadCount: { type: Number, default: 0 },
        lastDownloaded: Date,
        type: { type: String, enum: ['participation', 'completion', 'achievement'] },
        verificationCode: String
    },
    accommodations: {
        dietary: [String],
        accessibility: [String],
        language: String,
        other: String
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String,
        email: String
    },
    source: {
        channel: { type: String, enum: ['web', 'mobile', 'admin', 'import', 'api'], default: 'web' },
        referrer: String,
        campaign: String,
        medium: String,
        utm: {
            source: String,
            medium: String,
            campaign: String,
            term: String,
            content: String
        }
    },
    registrationDate: { type: Date, default: Date.now },
    cancelledAt: Date,
    cancellationReason: String,
    notes: String,
    internalNotes: String,
    tags: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Thêm compound index
registrationSchema.index({ event: 1, user: 1 }, { unique: true });

const certificateSchema = new mongoose.Schema({
    certificateId: { type: String, unique: true, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    type: { type: String, enum: ['participation', 'completion', 'achievement', 'excellence'], required: true },
    title: { type: String, required: true },
    description: String,
    recipient: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        studentId: String
    },
    eventInfo: {
        title: { type: String, required: true },
        date: { type: Date, required: true },
        durationHours: Number,
        location: String,
        organizer: String
    },
    template: { type: String, default: 'default' },
    customContent: {
        header: String,
        body: String,
        footer: String
    },
    skills: [String],
    competencies: [String],
    trainingPoints: { type: Number, default: 0 },
    grade: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Pass', 'Fail'] },
    score: { type: Number, min: 0, max: 100 },
    verificationCode: { type: String, unique: true, required: true },
    qrCode: String,
    digitalSignature: String,
    file: {
        url: String,
        name: String,
        size: Number,
        mimeType: { type: String, default: 'application/pdf' }
    },
    issuer: {
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        issuedDate: { type: Date, default: Date.now },
        name: { type: String, required: true },
        title: String,
        signature: String
    },
    organization: {
        name: { type: String, required: true },
        logo: String,
        address: String,
        website: String,
        email: String,
        phone: String
    },
    status: { type: String, enum: ['draft', 'issued', 'revoked', 'expired'], default: 'issued' },
    expiryDate: Date,
    revocation: {
        date: Date,
        revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String
    },
    analytics: {
        viewCount: { type: Number, default: 0 },
        downloadCount: { type: Number, default: 0 },
        lastViewed: Date,
        lastDownloaded: Date,
        sharedCount: { type: Number, default: 0 }
    },
    version: { type: String, default: '1.0' },
    generatedAt: { type: Date, default: Date.now },
    templateVersion: String,
    customFields: { type: Map, of: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientType: { type: String, enum: ['user', 'group', 'role', 'all'], default: 'user' },
    recipientGroups: [String],
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderType: { type: String, enum: ['user', 'system', 'auto'], default: 'system' },
    type: {
        type: String,
        enum: [
            'event_reminder', 'event_update', 'event_cancelled', 'event_published',
            'registration_confirmed', 'registration_approved', 'registration_rejected',
            'waitlist_promotion', 'check_in_reminder', 'certificate_ready', 'feedback_request',
            'system_announcement', 'account_update', 'security_alert', 'payment_confirmed',
            'payment_failed', 'deadline_reminder'
        ],
        required: true
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true },
    shortMessage: { type: String, maxlength: 100 },
    content: {
        html: String,
        markdown: String,
        attachments: [String],
        images: [String],
        actions: [{
            label: String,
            url: String,
            type: String
        }]
    },
    relatedEntities: {
        event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
        registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },
        certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    delivery: {
        inApp: {
            enabled: { type: Boolean, default: true },
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            read: { type: Boolean, default: false },
            readAt: Date
        },
        email: {
            enabled: { type: Boolean, default: false },
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            opened: { type: Boolean, default: false },
            openedAt: Date,
            clicked: { type: Boolean, default: false },
            clickedAt: Date,
            bounced: { type: Boolean, default: false },
            messageId: String
        },
        push: {
            enabled: { type: Boolean, default: false },
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            clicked: { type: Boolean, default: false },
            clickedAt: Date,
            deviceTokens: [String]
        },
        sms: {
            enabled: { type: Boolean, default: false },
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            messageId: String,
            phoneNumber: String
        }
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    urgency: { type: String, enum: ['background', 'normal', 'critical'], default: 'normal' },
    scheduledFor: Date,
    deliveredAt: Date,
    expiresAt: Date,
    status: { type: String, enum: ['draft', 'scheduled', 'sending', 'sent', 'delivered', 'failed', 'cancelled'], default: 'draft' },
    interactions: {
        views: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        replies: { type: Number, default: 0 }
    },
    template: {
        id: String,
        name: String,
        version: String
    },
    personalizationVariables: { type: Map, of: mongoose.Schema.Types.Mixed },
    locale: { type: String, default: 'vi' },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    category: { type: String, enum: ['events', 'account', 'system', 'marketing', 'support', 'security'], default: 'events' },
    tags: [String],
    batch: {
        id: String,
        campaignId: String,
        campaignName: String,
        campaignType: String
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    source: String,
    version: String,
    environment: String,
    userAgent: String,
    ipAddress: String,
    customFields: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const emailTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, maxlength: 100 },
    subject: { type: String, required: true, maxlength: 255 },
    bodyHtml: { type: String, required: true },
    bodyText: String,
    variables: [String],
    category: { type: String, maxlength: 50 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const systemSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, maxlength: 100 },
    value: mongoose.Schema.Types.Mixed,
    description: { type: String, maxlength: 255 },
    dataType: { type: String, enum: ['string', 'integer', 'boolean', 'json'], default: 'string' },
    isPublic: { type: Boolean, default: false }
}, { timestamps: true });

const fileUploadSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filename: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimetype: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    fileUrl: String,
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    isPublic: { type: Boolean, default: false }
}, { timestamps: true });

// Tạo models
const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Event = mongoose.model('Event', eventSchema);
const Registration = mongoose.model('Registration', registrationSchema);
const Certificate = mongoose.model('Certificate', certificateSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

async function seedData() {
    try {
        console.log('Xóa dữ liệu cũ...');
        await User.deleteMany({});
        await Category.deleteMany({});
        await Event.deleteMany({});
        await Registration.deleteMany({});
        await Certificate.deleteMany({});
        await Notification.deleteMany({});
        await EmailTemplate.deleteMany({});
        await SystemSetting.deleteMany({});
        await FileUpload.deleteMany({});

        // Hash password
        const hashedPassword = await bcrypt.hash('password123', 12);

        // 1. Tạo users
        console.log('Tạo users...');
        const admin = await User.create({
            email: 'admin@schoolevent.com',
            username: 'admin',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'System',
            fullName: 'Admin System',
            role: 'admin',
            emailVerified: true,
            status: 'active',
            address: {
                street: '123 Admin Street',
                city: 'Ha Noi',
                state: 'Ha Noi',
                zipCode: '100000',
                country: 'Vietnam'
            },
            preferences: {
                language: 'vi',
                timezone: 'Asia/Ho_Chi_Minh',
                notifications: {
                    email: true,
                    push: true,
                    sms: false
                }
            }
        });

        const organizer = await User.create({
            email: 'organizer@schoolevent.com',
            username: 'organizer',
            password: hashedPassword,
            firstName: 'Nguyen',
            lastName: 'Van A',
            fullName: 'Nguyen Van A',
            role: 'organizer',
            faculty: 'Quan tri Kinh doanh',
            major: 'Marketing',
            year: 4,
            emailVerified: true,
            status: 'active',
            address: {
                street: '456 Organizer Ave',
                city: 'Ho Chi Minh',
                state: 'Ho Chi Minh',
                zipCode: '700000',
                country: 'Vietnam'
            }
        });

        const student = await User.create({
            email: 'student@schoolevent.com',
            username: 'student',
            password: hashedPassword,
            firstName: 'Tran',
            lastName: 'Thi B',
            fullName: 'Tran Thi B',
            role: 'student',
            studentId: 'SV2023001',
            faculty: 'Cong nghe Thong tin',
            major: 'Ky thuat Phan mem',
            year: 3,
            gpa: 3.5,
            enrollmentDate: new Date('2023-09-01'),
            emailVerified: true,
            status: 'active',
            address: {
                street: '789 Student Road',
                city: 'Da Nang',
                state: 'Da Nang',
                zipCode: '550000',
                country: 'Vietnam'
            }
        });

        // 2. Tạo categories
        console.log('Tạo categories...');
        const workshopCat = await Category.create({
            name: 'Workshop',
            slug: 'workshop',
            description: 'Cac buoi thuc hanh va ky nang',
            color: '#28a745',
            icon: 'fas fa-tools',
            isActive: true,
            sortOrder: 1,
            createdBy: admin._id
        });

        const seminarCat = await Category.create({
            name: 'Hoi thao',
            slug: 'hoi-thao',
            description: 'Cac buoi hoi thao hoc thuat',
            color: '#007bff',
            icon: 'fas fa-chalkboard-teacher',
            isActive: true,
            sortOrder: 2,
            createdBy: admin._id
        });

        const competitionCat = await Category.create({
            name: 'Thi dau',
            slug: 'thi-dau',
            description: 'Cac cuoc thi va giai dau',
            color: '#dc3545',
            icon: 'fas fa-trophy',
            isActive: true,
            sortOrder: 3,
            createdBy: admin._id
        });

        // 3. Tạo events
        console.log('Tạo events...');
        const event1 = await Event.create({
            title: 'Workshop React.js Co Ban',
            slug: 'workshop-reactjs-co-ban',
            eventCode: 'WS001',
            shortDescription: 'Hoc React.js tu co ban den nang cao cho sinh vien IT',
            fullDescription: 'Khoa hoc React.js toan dien bao gom: JSX, Components, Props, State, Hooks, va xay dung ung dung thuc te',
            bannerImage: '/images/events/react-workshop.jpg',
            startDate: new Date('2024-03-15T09:00:00Z'),
            endDate: new Date('2024-03-15T17:00:00Z'),
            registrationStart: new Date('2024-02-15T00:00:00Z'),
            registrationEnd: new Date('2024-03-14T23:59:59Z'),
            timezone: 'Asia/Ho_Chi_Minh',
            locationType: 'physical',
            venue: {
                name: 'Phong A101',
                address: '123 Duong Giai Phong',
                city: 'Ha Noi',
                country: 'Vietnam',
                capacity: 50,
                facilities: ['Projector', 'Wi-Fi', 'Air Conditioning']
            },
            organizer: organizer._id,
            category: workshopCat._id,
            eventType: 'workshop',
            difficulty: 'beginner',
            tags: ['React', 'JavaScript', 'Frontend', 'Web Development'],
            targetAudience: {
                faculties: ['Cong nghe Thong tin'],
                majors: ['Ky thuat Phan mem', 'He thong Thong tin'],
                years: [2, 3, 4],
                prerequisites: ['HTML', 'CSS', 'JavaScript co ban']
            },
            registrationOpen: true,
            requiresApproval: false,
            maxParticipants: 50,
            currentParticipants: 0,
            waitlistEnabled: true,
            isFree: true,
            price: 0,
            currency: 'VND',
            trainingPoints: 20,
            certificate: {
                type: 'completion',
                template: 'workshop_template'
            },
            skills: ['React.js', 'Component Development', 'State Management'],
            agenda: 'Morning: React basics, JSX syntax. Afternoon: Components, Props, State. Evening: Hooks and practical project.',
            speakers: [{
                name: 'Le Van C',
                title: 'Senior Frontend Developer',
                bio: 'Co 5 nam kinh nghiem voi React.js',
                avatar: '/images/speakers/levanc.jpg'
            }],
            status: 'published',
            visibility: 'public',
            featured: true,
            settings: {
                allowWaitlist: true,
                sendReminders: true,
                enableQrCode: true,
                autoApprove: true
            },
            statistics: {
                viewsCount: 125,
                registrationsCount: 0
            },
            createdBy: admin._id,
            publishedAt: new Date()
        });

        const event2 = await Event.create({
            title: 'Hoi thao Khoi nghiep 2024',
            slug: 'hoi-thao-khoi-nghiep-2024',
            eventCode: 'SEM001',
            shortDescription: 'Co hoi hoc hoi tu cac startup founder thanh cong',
            fullDescription: 'Hoi thao voi cac founder, CEO startup thanh cong tai Viet Nam. Chia se kinh nghiem khoi nghiep, goi von, va phat trien doanh nghiep',
            bannerImage: '/images/events/startup-seminar.jpg',
            startDate: new Date('2024-03-20T14:00:00Z'),
            endDate: new Date('2024-03-20T17:00:00Z'),
            registrationStart: new Date('2024-02-20T00:00:00Z'),
            registrationEnd: new Date('2024-03-19T23:59:59Z'),
            locationType: 'hybrid',
            venue: {
                name: 'Hoi truong lon',
                address: '456 Duong Cach Mang Thang 8',
                city: 'Ho Chi Minh',
                country: 'Vietnam',
                capacity: 200
            },
            onlineLocation: {
                platform: 'Zoom',
                meetingLink: 'https://zoom.us/j/123456789',
                meetingId: '123-456-789',
                meetingPassword: 'startup2024'
            },
            organizer: organizer._id,
            category: seminarCat._id,
            eventType: 'seminar',
            difficulty: 'all-levels',
            tags: ['Startup', 'Entrepreneurship', 'Business', 'Investment'],
            maxParticipants: 200,
            isFree: false,
            price: 100000,
            currency: 'VND',
            earlyBird: {
                price: 80000,
                deadline: new Date('2024-03-10T23:59:59Z')
            },
            speakers: [
                {
                    name: 'Nguyen Van Startup',
                    title: 'CEO & Founder of TechViet',
                    bio: 'Thanh lap va phat trien startup thanh cong voi hon 1 trieu nguoi dung',
                    avatar: '/images/speakers/nguyenvanstartup.jpg'
                },
                {
                    name: 'Tran Thi Investor',
                    title: 'Managing Partner at VN Ventures',
                    bio: 'Dau tu vao hon 50 startup tai Dong Nam A',
                    avatar: '/images/speakers/tranthiinvestor.jpg'
                }
            ],
            status: 'published',
            visibility: 'public',
            featured: true,
            createdBy: admin._id,
            publishedAt: new Date()
        });

        // 4. Tạo registrations mẫu
        console.log('Tạo registrations...');
        const reg1 = await Registration.create({
            event: event1._id,
            user: student._id,
            registrationNumber: 'REG-WS001-001',
            registrationType: 'individual',
            status: 'approved',
            approval: {
                status: 'auto_approved',
                approvedAt: new Date()
            },
            payment: {
                required: false,
                status: 'completed',
                amount: 0
            },
            attendance: {
                checkedIn: false
            },
            notifications: {
                email: true,
                push: true,
                reminders: true
            },
            registrationDate: new Date(),
            createdBy: student._id
        });

        // 5. Tạo system settings
        console.log('Tạo system settings...');
        await SystemSetting.create([
            {
                key: 'site_name',
                value: 'Student Event Management',
                description: 'Ten website',
                dataType: 'string',
                isPublic: true
            },
            {
                key: 'site_description',
                value: 'He thong quan ly su kien sinh vien',
                description: 'Mo ta website',
                dataType: 'string',
                isPublic: true
            },
            {
                key: 'max_file_size',
                value: 10485760,
                description: 'Kich thuoc file toi da (bytes)',
                dataType: 'integer',
                isPublic: false
            },
            {
                key: 'email_from_address',
                value: 'noreply@schoolevent.com',
                description: 'Email gui di mac dinh',
                dataType: 'string',
                isPublic: false
            },
            {
                key: 'registration_open',
                value: true,
                description: 'Cho phep dang ky tai khoan moi',
                dataType: 'boolean',
                isPublic: true
            }
        ]);

        // 6. Tạo email templates
        console.log('Tạo email templates...');
        await EmailTemplate.create([
            {
                name: 'welcome',
                subject: 'Chao mung ban den voi he thong!',
                bodyHtml: '<h1>Chao mung {{firstName}}!</h1><p>Cam on ban da dang ky tai khoan tai he thong quan ly su kien sinh vien.</p>',
                variables: ['firstName'],
                category: 'auth',
                isActive: true,
                createdBy: admin._id
            },
            {
                name: 'event_registration',
                subject: 'Dang ky su kien thanh cong',
                bodyHtml: '<h1>Dang ky thanh cong!</h1><p>Ban da dang ky tham gia su kien {{eventTitle}} thanh cong.</p><p>Ma dang ky: {{registrationNumber}}</p>',
                variables: ['eventTitle', 'registrationNumber'],
                category: 'event',
                isActive: true,
                createdBy: admin._id
            }
        ]);

        // 7. Tạo notification mẫu
        console.log('Tạo notifications...');
        await Notification.create({
            recipient: student._id,
            type: 'registration_confirmed',
            title: 'Dang ky su kien thanh cong',
            message: 'Ban da dang ky thanh cong su kien Workshop React.js Co Ban',
            relatedEntities: {
                event: event1._id,
                registration: reg1._id
            },
            delivery: {
                inApp: {
                    enabled: true,
                    delivered: true,
                    deliveredAt: new Date()
                }
            },
            priority: 'normal',
            status: 'delivered',
            category: 'events',
            createdBy: admin._id
        });

        console.log('Seed data completed successfully!');
        console.log('=== SUMMARY ===');
        console.log('Users: 3 (admin, organizer, student)');
        console.log('Categories: 3 (workshop, seminar, competition)');
        console.log('Events: 2 (React workshop, Startup seminar)');
        console.log('Registrations: 1 (student -> React workshop)');
        console.log('System Settings: 5');
        console.log('Email Templates: 2');
        console.log('Notifications: 1');
        console.log('=== LOGIN CREDENTIALS ===');
        console.log('admin@schoolevent.com / password123');
        console.log('organizer@schoolevent.com / password123');
        console.log('student@schoolevent.com / password123');

    } catch (error) {
        console.error('Seed error:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
    }
}

// Main function
async function main() {
    try {
        await connectDB();
        await seedData();
        process.exit(0);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { seedData, connectDB };