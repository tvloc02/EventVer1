// frontend/src/components/admin/EmailTemplates.jsx
import React, { useState, useEffect } from 'react';
import {
    Mail, Plus, Edit, Trash2, Eye, Send,
    Search, Filter, Copy, Download
} from 'lucide-react';
import Modal from '../common/Modal';

const EmailTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            // Mock templates data
            const mockTemplates = [
                {
                    id: 1,
                    name: 'Chào mừng người dùng mới',
                    subject: 'Chào mừng bạn đến với EventHub!',
                    type: 'welcome',
                    content: `<div>
                        <h2>Chào mừng {{userName}}!</h2>
                        <p>Cảm ơn bạn đã tham gia EventHub. Chúng tôi rất vui mừng được chào đón bạn!</p>
                        <p>Bạn có thể bắt đầu khám phá các sự kiện thú vị ngay bây giờ.</p>
                    </div>`,
                    variables: ['userName', 'userEmail'],
                    isActive: true,
                    createdAt: '2025-01-10',
                    updatedAt: '2025-01-15'
                },
                {
                    id: 2,
                    name: 'Xác nhận đăng ký sự kiện',
                    subject: 'Xác nhận đăng ký: {{eventName}}',
                    type: 'event_registration',
                    content: `<div>
                        <h2>Đăng ký thành công!</h2>
                        <p>Chào {{userName}},</p>
                        <p>Bạn đã đăng ký thành công sự kiện <strong>{{eventName}}</strong>.</p>
                        <p><strong>Thời gian:</strong> {{eventDate}}</p>
                        <p><strong>Địa điểm:</strong> {{eventLocation}}</p>
                    </div>`,
                    variables: ['userName', 'eventName', 'eventDate', 'eventLocation'],
                    isActive: true,
                    createdAt: '2025-01-08',
                    updatedAt: '2025-01-12'
                },
                {
                    id: 3,
                    name: 'Nhắc nhở sự kiện',
                    subject: 'Nhắc nhở: {{eventName}} bắt đầu trong {{timeRemaining}}',
                    type: 'event_reminder',
                    content: `<div>
                        <h2>Sự kiện sắp diễn ra!</h2>
                        <p>Chào {{userName}},</p>
                        <p>Sự kiện <strong>{{eventName}}</strong> sẽ bắt đầu trong {{timeRemaining}}.</p>
                        <p>Đừng quên tham gia đúng giờ!</p>
                    </div>`,
                    variables: ['userName', 'eventName', 'timeRemaining'],
                    isActive: true,
                    createdAt: '2025-01-05',
                    updatedAt: '2025-01-10'
                }
            ];

            setTemplates(mockTemplates);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const templateTypes = [
        { value: 'welcome', label: 'Chào mừng' },
        { value: 'event_registration', label: 'Đăng ký sự kiện' },
        { value: 'event_reminder', label: 'Nhắc nhở sự kiện' },
        { value: 'event_cancellation', label: 'Hủy sự kiện' },
        { value: 'certificate_ready', label: 'Chứng nhận sẵn sàng' },
        { value: 'password_reset', label: 'Đặt lại mật khẩu' }
    ];

    const getTypeLabel = (type) => {
        return templateTypes.find(t => t.value === type)?.label || type;
    };

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setShowTemplateForm(true);
    };

    const handlePreview = (template) => {
        setSelectedTemplate(template);
        setShowPreview(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa template này?')) {
            try {
                setTemplates(templates.filter(t => t.id !== id));
            } catch (error) {
                console.error('Error deleting template:', error);
            }
        }
    };

    const handleDuplicate = (template) => {
        const newTemplate = {
            ...template,
            id: Date.now(),
            name: `${template.name} (Bản sao)`,
            createdAt: new Date().toISOString().split('T')[0]
        };
        setTemplates([newTemplate, ...templates]);
    };

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                        <Mail className="w-5 h-5" />
                        <span>Mẫu email</span>
                    </h2>

                    <button
                        onClick={() => {
                            setEditingTemplate(null);
                            setShowTemplateForm(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Tạo mẫu mới</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm mẫu email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Không tìm thấy mẫu email nào</p>
                    </div>
                ) : (
                    filteredTemplates.map((template) => (
                        <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                                            {template.name}
                                        </h3>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {getTypeLabel(template.type)}
                                        </span>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${template.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-2">
                                        <strong>Tiêu đề:</strong> {template.subject}
                                    </p>
                                    <div className="text-xs text-gray-500">
                                        <p>Tạo: {new Date(template.createdAt).toLocaleDateString('vi-VN')}</p>
                                        <p>Cập nhật: {new Date(template.updatedAt).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>

                                {template.variables && template.variables.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-2">Biến:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {template.variables.map((variable, index) => (
                                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                                    {`{{${variable}}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePreview(template)}
                                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        title="Xem trước"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                        title="Chỉnh sửa"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(template)}
                                        className="p-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                        title="Sao chép"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                        title="Xóa"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Template Form Modal */}
            <Modal
                isOpen={showTemplateForm}
                onClose={() => setShowTemplateForm(false)}
                title={editingTemplate ? 'Chỉnh sửa mẫu email' : 'Tạo mẫu email mới'}
                size="large"
            >
                <TemplateForm
                    template={editingTemplate}
                    onSave={(templateData) => {
                        if (editingTemplate) {
                            setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...t, ...templateData } : t));
                        } else {
                            const newTemplate = {
                                id: Date.now(),
                                ...templateData,
                                createdAt: new Date().toISOString().split('T')[0],
                                updatedAt: new Date().toISOString().split('T')[0]
                            };
                            setTemplates([newTemplate, ...templates]);
                        }
                        setShowTemplateForm(false);
                    }}
                    onCancel={() => setShowTemplateForm(false)}
                />
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                title="Xem trước mẫu email"
                size="large"
            >
                {selectedTemplate && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề:</label>
                            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedTemplate.subject}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung:</label>
                            <div
                                className="border border-gray-300 rounded-lg p-4 bg-white"
                                dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const TemplateForm = ({ template, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: template?.name || '',
        subject: template?.subject || '',
        type: template?.type || 'welcome',
        content: template?.content || '',
        variables: template?.variables?.join(', ') || '',
        isActive: template?.isActive ?? true
    });

    const templateTypes = [
        { value: 'welcome', label: 'Chào mừng' },
        { value: 'event_registration', label: 'Đăng ký sự kiện' },
        { value: 'event_reminder', label: 'Nhắc nhở sự kiện' },
        { value: 'event_cancellation', label: 'Hủy sự kiện' },
        { value: 'certificate_ready', label: 'Chứng nhận sẵn sàng' },
        { value: 'password_reset', label: 'Đặt lại mật khẩu' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const templateData = {
            ...formData,
            variables: formData.variables.split(',').map(v => v.trim()).filter(v => v),
            updatedAt: new Date().toISOString().split('T')[0]
        };
        onSave(templateData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên mẫu</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại mẫu</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {templateTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề email</label>
                <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="VD: Chào mừng {{userName}} đến với EventHub!"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung email</label>
                <textarea
                    required
                    rows={12}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Nhập nội dung HTML của email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Hỗ trợ HTML và biến động như {{userName}}, {{eventName}}, etc.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Biến động (Variables)</label>
                <input
                    type="text"
                    value={formData.variables}
                    onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                    placeholder="userName, eventName, eventDate (phân cách bằng dấu phẩy)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Kích hoạt mẫu này
                </label>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    {template ? 'Cập nhật' : 'Tạo mẫu'}
                </button>
            </div>
        </form>
    );
};

export default EmailTemplates;