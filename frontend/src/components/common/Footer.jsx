import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Mail, Phone, MapPin, Facebook, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold">EventHub</span>
                        </div>
                        <p className="text-gray-300 text-sm mb-4">
                            Hệ thống quản lý sự kiện toàn diện dành cho sinh viên và nhà trường.
                            Kết nối, học hỏi và phát triển cùng cộng đồng.
                        </p>
                        <div className="flex items-center space-x-4">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors">
                                <Youtube className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Liên kết nhanh</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                                    Trang chủ
                                </Link>
                            </li>
                            <li>
                                <Link to="/events" className="text-gray-300 hover:text-white transition-colors">
                                    Sự kiện
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="text-gray-300 hover:text-white transition-colors">
                                    Giới thiệu
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors">
                                    Liên hệ
                                </Link>
                            </li>
                            <li>
                                <Link to="/help" className="text-gray-300 hover:text-white transition-colors">
                                    Hỗ trợ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Dịch vụ</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/events/create" className="text-gray-300 hover:text-white transition-colors">
                                    Tạo sự kiện
                                </Link>
                            </li>
                            <li>
                                <Link to="/certificates" className="text-gray-300 hover:text-white transition-colors">
                                    Chứng nhận
                                </Link>
                            </li>
                            <li>
                                <Link to="/reports" className="text-gray-300 hover:text-white transition-colors">
                                    Báo cáo
                                </Link>
                            </li>
                            <li>
                                <Link to="/api" className="text-gray-300 hover:text-white transition-colors">
                                    API
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Liên hệ</h3>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                                <MapPin className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                  123 Đường ABC, Quận XYZ, TP.HCM
                </span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Phone className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                  (028) 1234 5678
                </span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Mail className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-300 text-sm">
                  contact@eventhub.edu.vn
                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-8 pt-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <p className="text-gray-400 text-sm">
                            © 2025 EventHub. Tất cả quyền được bảo lưu.
                        </p>
                        <div className="flex items-center space-x-6 mt-4 md:mt-0">
                            <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                                Chính sách bảo mật
                            </Link>
                            <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                                Điều khoản sử dụng
                            </Link>
                            <Link to="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
                                Chính sách Cookie
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;