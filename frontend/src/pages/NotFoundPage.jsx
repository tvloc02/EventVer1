import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFoundPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Không tìm thấy trang
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        <span>Về trang chủ</span>
                    </Link>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Quay lại</span>
                        </button>

                        <Link
                            to="/events"
                            className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            <span>Tìm sự kiện</span>
                        </Link>
                    </div>
                </div>

                <div className="mt-12 text-sm text-gray-500">
                    <p>Nếu bạn cần hỗ trợ, vui lòng liên hệ:</p>
                    <p className="mt-2">
                        <a href="mailto:support@eventhub.edu.vn" className="text-blue-600 hover:text-blue-800">
                            support@eventhub.edu.vn
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;