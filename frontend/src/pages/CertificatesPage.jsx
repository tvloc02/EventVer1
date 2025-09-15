import React, { useState, useEffect } from 'react';
import { certificateService } from '../services/certificateService';
import {
    Award, Download, Eye, Search, Filter,
    Calendar, MapPin, CheckCircle
} from 'lucide-react';

const CertificatesPage = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCert, setSelectedCert] = useState(null);
    const [showViewer, setShowViewer] = useState(false);

    useEffect(() => {
        loadCertificates();
    }, []);

    const loadCertificates = async () => {
        try {
            setLoading(true);
            const response = await certificateService.getMyCertificates();
            setCertificates(response.data || []);
        } catch (error) {
            console.error('Error loading certificates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (certificate) => {
        try {
            const blob = await certificateService.downloadCertificate(certificate.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${certificate.eventName}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading certificate:', error);
        }
    };

    const handleViewCertificate = (certificate) => {
        setSelectedCert(certificate);
        setShowViewer(true);
    };

    const filteredCertificates = certificates.filter(cert =>
        cert.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.eventOrganizer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Award className="w-6 h-6" />
                        <span>Chứng nhận của tôi</span>
                    </h1>
                    <p className="text-gray-600 mt-1">Quản lý và tải xuống các chứng nhận đã nhận</p>
                </div>

                {/* Search and Stats */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex-1 max-w-md relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm chứng nhận..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{certificates.length}</p>
                                <p className="text-sm text-gray-600">Tổng chứng nhận</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Certificates Grid */}
                {filteredCertificates.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có chứng nhận</h3>
                        <p className="text-gray-500">Bạn chưa nhận được chứng nhận nào. Hãy tham gia các sự kiện để nhận chứng nhận!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCertificates.map((certificate) => (
                            <div key={certificate.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                                <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center relative">
                                    <Award className="w-16 h-16 text-blue-600" />
                                    <div className="absolute top-4 right-4">
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                        {certificate.eventName}
                                    </h3>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            <span>{new Date(certificate.eventDate).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 mr-2" />
                                            <span>{certificate.eventOrganizer}</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-500 mb-4">
                                        Mã chứng nhận: {certificate.code}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleViewCertificate(certificate)}
                                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span>Xem</span>
                                        </button>
                                        <button
                                            onClick={() => handleDownload(certificate)}
                                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Tải</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Certificate Viewer Modal */}
                {showViewer && selectedCert && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowViewer(false)} />

                            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-gray-900">Xem chứng nhận</h3>
                                    <button
                                        onClick={() => setShowViewer(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <Award className="w-24 h-24 text-blue-600 mx-auto mb-6" />
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">CHỨNG NHẬN THAM GIA</h2>
                                            <h3 className="text-xl font-semibold text-blue-600 mb-4">{selectedCert.eventName}</h3>
                                            <p className="text-gray-700 mb-2">Được trao cho</p>
                                            <p className="text-lg font-semibold text-gray-900 mb-4">{selectedCert.participantName}</p>
                                            <p className="text-sm text-gray-600">
                                                Ngày tổ chức: {new Date(selectedCert.eventDate).toLocaleDateString('vi-VN')}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Tổ chức bởi: {selectedCert.eventOrganizer}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-4">
                                                Mã chứng nhận: {selectedCert.code}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center space-x-4 mt-6">
                                        <button
                                            onClick={() => handleDownload(selectedCert)}
                                            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Tải xuống PDF</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CertificatesPage;