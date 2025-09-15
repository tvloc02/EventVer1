// frontend/src/components/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';

const schema = yup.object({
    email: yup
        .string()
        .email('Email không hợp lệ')
        .required('Email là bắt buộc'),
});

const ForgotPassword = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        getValues
    } = useForm({
        resolver: yupResolver(schema)
    });

    const onSubmit = async (data) => {
        try {
            setLoading(true);

            // Mock API call - replace with actual service
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Simulate successful request
            setIsSubmitted(true);
        } catch (error) {
            setError('root', {
                message: error.message || 'Có lỗi xảy ra, vui lòng thử lại'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        try {
            setLoading(true);

            // Mock resend email API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Show success message
            alert('Đã gửi lại email khôi phục mật khẩu');
        } catch (error) {
            alert('Có lỗi xảy ra khi gửi lại email');
        } finally {
            setLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Kiểm tra email của bạn
                            </h2>

                            <p className="text-gray-600 mb-6">
                                Chúng tôi đã gửi liên kết khôi phục mật khẩu đến địa chỉ email
                                <span className="font-medium text-gray-900"> {getValues('email')}</span>
                            </p>

                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Không nhận được email? Kiểm tra thư mục spam hoặc
                                </p>

                                <button
                                    onClick={handleResendEmail}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Gửi lại email
                                        </>
                                    )}
                                </button>

                                <Link
                                    to="/login"
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Quay lại đăng nhập
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                </div>

                <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
                    Quên mật khẩu?
                </h2>

                <p className="mt-2 text-center text-sm text-gray-600">
                    Nhập email của bạn và chúng tôi sẽ gửi liên kết để đặt lại mật khẩu
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {errors.root && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {errors.root.message}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Địa chỉ email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    {...register('email')}
                                    type="email"
                                    placeholder="Nhập email của bạn"
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        errors.email ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 mr-2" />
                                    Gửi liên kết khôi phục
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Hoặc</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Link
                                to="/login"
                                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Quay lại đăng nhập
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;