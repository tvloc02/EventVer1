import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { eventService } from '../../services/eventService';
import { UserPlus, CheckCircle, Loader, X } from 'lucide-react';
import { toast } from 'react-toastify';

const EventRegistration = ({ event, isRegistered, onRegistrationChange }) => {
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(!isRegistered);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm();

    const handleRegister = async (data) => {
        try {
            setLoading(true);
            await eventService.registerForEvent(event.id, {
                ...data,
                eventId: event.id
            });

            toast.success('Đăng ký thành công!');
            onRegistrationChange(true);
            setShowForm(false);
            reset();
        } catch (error) {
            toast.error(error.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRegistration = async () => {
        try {
            setLoading(true);
            await eventService.cancelRegistration(event.id);

            toast.success('Hủy đăng ký thành công!');
            onRegistrationChange(false);
            setShowForm(true);
        } catch (error) {
            toast.error(error.message || 'Hủy đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    };

    if (isRegistered) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                        <h3 className="font-semibold text-green-800">Đã đăng ký thành công</h3>
                        <p className="text-sm text-green-600">Bạn đã đăng ký tham gia sự kiện này</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="text-sm">
                        <p className="text-gray-600">Mã đăng ký: <span className="font-mono text-gray-900">#REG{event.id}001</span></p>
                        <p className="text-gray-600">Ngày đăng ký: {new Date().toLocaleDateString('vi-VN')}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleCancelRegistration}
                            disabled={loading}
                            className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            <span>Hủy đăng ký</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!showForm) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <UserPlus className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-blue-800 mb-2">Tham gia sự kiện</h3>
                <p className="text-sm text-blue-600 mb-4">Đăng ký ngay để không bỏ lỡ sự kiện thú vị này</p>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                    Đăng ký tham gia
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Đăng ký tham gia</h3>
                <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ghi chú (tùy chọn)
                    </label>
                    <textarea
                        {...register('note')}
                        rows={3}
                        placeholder="Ghi chú về lý do tham gia hoặc câu hỏi..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {event.fee > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm font-medium text-yellow-800">
                Phí tham gia: {event.fee.toLocaleString('vi-VN')} VND
              </span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                            Bạn sẽ cần thanh toán phí này để hoàn tất đăng ký
                        </p>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <input
                        {...register('agreeTerms', { required: 'Bạn phải đồng ý với điều khoản' })}
                        type="checkbox"
                        id="agreeTerms"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                        Tôi đồng ý với điều khoản và quy định của sự kiện
                    </label>
                </div>
                {errors.agreeTerms && (
                    <p className="text-sm text-red-600">{errors.agreeTerms.message}</p>
                )}

                <div className="flex items-center space-x-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserPlus className="w-4 h-4" />
                        )}
                        <span>{loading ? 'Đang đăng ký...' : 'Xác nhận đăng ký'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EventRegistration;