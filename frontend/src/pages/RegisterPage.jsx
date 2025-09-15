import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import RegisterForm from '../components/auth/RegisterForm';
import OAuthButtons from '../components/auth/OAuthButtons';

const RegisterPage = () => {
    const navigate = useNavigate();

    const handleRegisterSuccess = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="flex items-center space-x-2">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">EventHub</span>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
                    Tạo tài khoản mới
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Đã có tài khoản?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Đăng nhập ngay
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <RegisterForm onSuccess={handleRegisterSuccess} />

                    <div className="mt-6">
                        <OAuthButtons />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;