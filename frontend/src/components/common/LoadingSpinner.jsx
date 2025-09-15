import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({
                            size = 'medium',
                            color = 'blue',
                            text = null,
                            fullscreen = false,
                            overlay = false
                        }) => {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-6 h-6',
        large: 'w-8 h-8',
        xlarge: 'w-12 h-12'
    };

    const colorClasses = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        red: 'text-red-600',
        gray: 'text-gray-600',
        white: 'text-white'
    };

    const spinner = (
        <div className="flex flex-col items-center space-y-2">
            <Loader className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
            {text && (
                <p className={`text-sm ${colorClasses[color]}`}>{text}</p>
            )}
        </div>
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    if (overlay) {
        return (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-4">
            {spinner}
        </div>
    );
};

export default LoadingSpinner;