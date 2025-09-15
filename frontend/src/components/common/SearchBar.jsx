import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock } from 'lucide-react';

const SearchBar = ({
                       placeholder = 'Tìm kiếm...',
                       value = '',
                       onChange,
                       onSearch,
                       onClear,
                       showSuggestions = true,
                       suggestions = [],
                       recentSearches = [],
                       loading = false,
                       debounceMs = 300,
                       className = ''
                   }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);

        if (onChange) {
            onChange(newValue);
        }

        // Debounce search
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            if (onSearch) {
                onSearch(newValue);
            }
        }, debounceMs);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(localValue);
        }
        setIsFocused(false);
    };

    const handleClear = () => {
        setLocalValue('');
        if (onChange) {
            onChange('');
        }
        if (onClear) {
            onClear();
        }
        inputRef.current?.focus();
    };

    const handleSuggestionClick = (suggestion) => {
        setLocalValue(suggestion);
        if (onChange) {
            onChange(suggestion);
        }
        if (onSearch) {
            onSearch(suggestion);
        }
        setIsFocused(false);
    };

    const showDropdown = isFocused && (suggestions.length > 0 || recentSearches.length > 0);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={localValue}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <div className="absolute inset-y-0 right-0 flex items-center">
                        {loading && (
                            <div className="pr-3">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {localValue && !loading && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="pr-3 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {/* Dropdown */}
            {showSuggestions && showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {/* Recent searches */}
                    {recentSearches.length > 0 && (
                        <div className="p-2 border-b border-gray-200">
                            <div className="text-xs font-medium text-gray-500 mb-2 px-2">Tìm kiếm gần đây</div>
                            {recentSearches.slice(0, 5).map((search, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(search)}
                                    className="w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                                >
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{search}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="p-2">
                            <div className="text-xs font-medium text-gray-500 mb-2 px-2">Gợi ý</div>
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="w-full text-left px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
                                >
                                    <Search className="w-4 h-4 text-gray-400" />
                                    <span>{suggestion}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;