// frontend/src/components/c/FormFields.jsx
import React, { forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle, Check, Info } from 'lucide-react';

// Input Field Component
export const InputField = forwardRef(({
                                          label,
                                          type = 'text',
                                          placeholder,
                                          value,
                                          onChange,
                                          error,
                                          required = false,
                                          disabled = false,
                                          icon: Icon,
                                          showPasswordToggle = false,
                                          hint,
                                          className = '',
                                          ...props
                                      }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                )}

                <input
                    ref={ref}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`
                        w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                        ${Icon ? 'pl-10' : ''}
                        ${showPasswordToggle ? 'pr-10' : ''}
                        ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                        ${error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }
                    `}
                    {...props}
                />

                {showPasswordToggle && type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                        {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                    </button>
                )}
            </div>

            {hint && !error && (
                <p className="text-sm text-gray-500 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    {hint}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
        </div>
    );
});

// Textarea Field Component
export const TextareaField = forwardRef(({
                                             label,
                                             placeholder,
                                             value,
                                             onChange,
                                             error,
                                             required = false,
                                             disabled = false,
                                             rows = 4,
                                             maxLength,
                                             hint,
                                             className = '',
                                             ...props
                                         }, ref) => {
    const [charCount, setCharCount] = React.useState(value?.length || 0);

    const handleChange = (e) => {
        setCharCount(e.target.value.length);
        if (onChange) onChange(e);
    };

    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                maxLength={maxLength}
                className={`
                    w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-vertical
                    ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                    ${error
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
                `}
                {...props}
            />

            <div className="flex justify-between items-center">
                <div>
                    {hint && !error && (
                        <p className="text-sm text-gray-500 flex items-center">
                            <Info className="w-4 h-4 mr-1" />
                            {hint}
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {error}
                        </p>
                    )}
                </div>

                {maxLength && (
                    <span className={`text-sm ${charCount > maxLength * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}>
                        {charCount}/{maxLength}
                    </span>
                )}
            </div>
        </div>
    );
});

// Select Field Component
export const SelectField = forwardRef(({
                                           label,
                                           options = [],
                                           value,
                                           onChange,
                                           error,
                                           required = false,
                                           disabled = false,
                                           placeholder = 'Chọn một tùy chọn',
                                           hint,
                                           className = '',
                                           ...props
                                       }, ref) => {
    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <select
                ref={ref}
                value={value || ''}
                onChange={onChange}
                disabled={disabled}
                className={`
                    w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                    ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                    ${error
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }
                `}
                {...props}
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {options.map((option, index) => (
                    <option key={index} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>

            {hint && !error && (
                <p className="text-sm text-gray-500 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    {hint}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
        </div>
    );
});

// Checkbox Field Component
export const CheckboxField = forwardRef(({
                                             label,
                                             checked,
                                             onChange,
                                             error,
                                             disabled = false,
                                             hint,
                                             className = '',
                                             children,
                                             ...props
                                         }, ref) => {
    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        ref={ref}
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        disabled={disabled}
                        className={`
                            w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            ${error ? 'border-red-300' : 'text-blue-600'}
                        `}
                        {...props}
                    />
                </div>

                {(label || children) && (
                    <div className="ml-3 text-sm">
                        <label className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                            {label || children}
                        </label>
                    </div>
                )}
            </div>

            {hint && !error && (
                <p className="text-sm text-gray-500 flex items-center ml-7">
                    <Info className="w-4 h-4 mr-1" />
                    {hint}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center ml-7">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
        </div>
    );
});

// Radio Group Component
export const RadioGroup = ({
                               label,
                               options = [],
                               value,
                               onChange,
                               error,
                               required = false,
                               disabled = false,
                               direction = 'vertical', // 'vertical' | 'horizontal'
                               hint,
                               className = ''
                           }) => {
    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div className={`${direction === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2'}`}>
                {options.map((option, index) => (
                    <div key={index} className="flex items-center">
                        <input
                            type="radio"
                            id={`radio-${index}`}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange && onChange(option.value)}
                            disabled={disabled || option.disabled}
                            className={`
                                w-4 h-4 border-gray-300 focus:ring-2 focus:ring-blue-500
                                ${disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                ${error ? 'border-red-300' : 'text-blue-600'}
                            `}
                        />
                        <label
                            htmlFor={`radio-${index}`}
                            className={`
                                ml-2 text-sm font-medium cursor-pointer
                                ${disabled || option.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}
                            `}
                        >
                            {option.label}
                        </label>
                    </div>
                ))}
            </div>

            {hint && !error && (
                <p className="text-sm text-gray-500 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    {hint}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
        </div>
    );
};

// Switch Component
export const SwitchField = ({
                                label,
                                checked,
                                onChange,
                                disabled = false,
                                size = 'medium', // 'small' | 'medium' | 'large'
                                hint,
                                className = ''
                            }) => {
    const sizeClasses = {
        small: 'w-8 h-4',
        medium: 'w-11 h-6',
        large: 'w-14 h-8'
    };

    const thumbSizeClasses = {
        small: 'w-3 h-3',
        medium: 'w-5 h-5',
        large: 'w-7 h-7'
    };

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center justify-between">
                {label && (
                    <label className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                        {label}
                    </label>
                )}

                <button
                    type="button"
                    onClick={() => !disabled && onChange && onChange(!checked)}
                    disabled={disabled}
                    className={`
                        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
                        ${sizeClasses[size]}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${checked ? 'bg-blue-600' : 'bg-gray-200'}
                    `}
                >
                    <span
                        className={`
                            inline-block rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out
                            ${thumbSizeClasses[size]}
                            ${checked ? 'translate-x-full' : 'translate-x-0.5'}
                        `}
                    />
                </button>
            </div>

            {hint && (
                <p className="text-sm text-gray-500 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    {hint}
                </p>
            )}
        </div>
    );
};

// File Input Component
export const FileInputField = ({
                                   label,
                                   accept,
                                   multiple = false,
                                   onChange,
                                   error,
                                   required = false,
                                   disabled = false,
                                   hint,
                                   className = ''
                               }) => {
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const fileInputRef = React.useRef(null);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        if (onChange) onChange(files);
    };

    const removeFile = (index) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        if (onChange) onChange(newFiles);

        // Clear input if no files
        if (newFiles.length === 0 && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileChange}
                    disabled={disabled}
                    className={`
                        w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                        file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium
                        file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                        ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                        ${error
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }
                    `}
                />
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="space-y-1">
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {hint && !error && (
                <p className="text-sm text-gray-500 flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    {hint}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {error}
                </p>
            )}
        </div>
    );
};