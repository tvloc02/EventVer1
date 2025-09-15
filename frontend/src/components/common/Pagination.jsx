import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
                        currentPage = 1,
                        totalPages = 1,
                        totalItems = 0,
                        itemsPerPage = 10,
                        onPageChange,
                        onItemsPerPageChange,
                        showItemsPerPage = true,
                        showInfo = true,
                        itemsPerPageOptions = [10, 20, 50, 100]
                    }) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getVisiblePages = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta);
             i <= Math.min(totalPages - 1, currentPage + delta);
             i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else {
            if (totalPages > 1) {
                rangeWithDots.push(totalPages);
            }
        }

        return rangeWithDots;
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
        }
    };

    if (totalPages <= 1) return null;

    const visiblePages = getVisiblePages();

    return (
        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                {/* Items info and per page selector */}
                <div className="flex items-center space-x-4">
                    {showInfo && (
                        <div className="text-sm text-gray-700">
                            Hiển thị <span className="font-medium">{startItem}</span> đến{' '}
                            <span className="font-medium">{endItem}</span> trong tổng số{' '}
                            <span className="font-medium">{totalItems}</span> mục
                        </div>
                    )}

                    {showItemsPerPage && (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">Hiển thị:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => onItemsPerPageChange?.(parseInt(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {itemsPerPageOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Pagination controls */}
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Trang đầu"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Trang trước"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-1">
                        {visiblePages.map((page, index) => (
                            <React.Fragment key={index}>
                                {page === '...' ? (
                                    <span className="px-3 py-2 text-gray-500">...</span>
                                ) : (
                                    <button
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                                            currentPage === page
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Trang sau"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Trang cuối"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;