const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    color: {
        type: String,
        default: '#1890ff',
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    },
    icon: {
        type: String,
        default: 'CalendarOutlined'
    },
    image: {
        type: String
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    subcategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    eventCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

categorySchema.pre('save', function(next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    }
    next();
});

categorySchema.statics.getHierarchy = async function() {
    const categories = await this.find({ isActive: true })
        .populate('subcategories')
        .sort({ sortOrder: 1, name: 1 });

    return categories.filter(cat => !cat.parentCategory);
};

module.exports = mongoose.model('Category', categorySchema);