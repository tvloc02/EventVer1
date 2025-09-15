import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { User, Mail, Lock, Eye, EyeOff, Phone, Loader } from 'lucide-react';

const schema = yup.object({
    name: yup.string().required('Họ tên là bắt buộc'),
    email: yup.string().email('Email không hợp lệ').required('Email là bắt buộc'),
    phone: yup.string().required('Số điện thoại là bắt buộc'),
    password: yup.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').required('Mật khẩu là bắt buộc'),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password')], 'Mật khẩu xác nhận không khớp')
        .required('Xác nhận mật khẩu là bắt buộc'),
    studentId: yup.string().required('Mã sinh viên là bắt buộc'),
    faculty: yup.string().required('Khoa là bắt buộc')
});

const RegisterForm = ({ onSuccess }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register: registerUser, isLoading } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError
    } = useForm({
        resolver: yupResolver(schema)
    });

    const onSubmit = async (data) => {
        try {
            const { confirmPassword, ...userData } = data;
            await registerUser(userData);
            if (onSuccess) onSuccess();
        } catch (error) {
            setError('root', {
                message: error.message || 'Đăng ký thất bại'
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errors.root && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errors.root.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Họ và tên
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            {...register('name')}
                            type="text"
                            placeholder="Nhập họ và tên"
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.name ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mã sinh viên
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            {...register('studentId')}
                            type="text"
                            placeholder="Nhập mã sinh viên"
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.studentId ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    {errors.studentId && (
                        <p className="mt-1 text-sm text-red-600">{errors.studentId.message}</p>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Số điện thoại
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            {...register('phone')}
                            type="tel"
                            placeholder="Nhập số điện thoại"
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                errors.phone ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Khoa
                    </label>
                    <select
                        {...register('faculty')}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.faculty ? 'border-red-300' : 'border-gray-300'
                        }`}
                    >
                        <option value="">Chọn khoa</option>
                        <option value="cntt">Công nghệ thông tin</option>
                        <option value="kinh-te">Kinh tế</option>
                        <option value="ngoai-ngu">Ngoại ngữ</option>
                        <option value="su-pham">Sư phạm</option>
                        <option value="y-duoc">Y dược</option>
                    </select>
                    {errors.faculty && (
                        <p className="mt-1 text-sm text-red-600">{errors.faculty.message}</p>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.password ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xác nhận mật khẩu
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        {...register('confirmPassword')}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Xác nhận mật khẩu"
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
            </div>

            <div className="flex items-center">
                <input
                    id="agree-terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-700">
                    Tôi đồng ý với{' '}
                    <a href="/terms" className="text-blue-600 hover:text-blue-500">
                        Điều khoản sử dụng
                    </a>{' '}
                    và{' '}
                    <a href="/privacy" className="text-blue-600 hover:text-blue-500">
                        Chính sách bảo mật
                    </a>
                </label>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                ) : (
                    'Đăng ký tài khoản'
                )}
            </button>
        </form>
    );
};

export default RegisterForm;