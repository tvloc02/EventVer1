import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, Loader } from 'lucide-react';

const schema = yup.object({
    email: yup
        .string()
        .email('Email không hợp lệ')
        .required('Email là bắt buộc'),
    password: yup
        .string()
        .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
        .required('Mật khẩu là bắt buộc'),
});

const LoginForm = ({ onSuccess }) => {
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading } = useAuth();

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
            await login(data);
            if (onSuccess) onSuccess();
        } catch (error) {
            setError('root', {
                message: error.message || 'Đăng nhập thất bại'
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

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                        Ghi nhớ đăng nhập
                    </label>
                </div>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                    Quên mật khẩu?
                </a>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                ) : (
                    'Đăng nhập'
                )}
            </button>
        </form>
    );
};

export default LoginForm;