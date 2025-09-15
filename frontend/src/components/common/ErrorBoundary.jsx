import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error to monitoring service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                    <div className="max-w-md w-full">
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>

                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Đã xảy ra lỗi
                            </h2>

                            <p className="text-gray-600 mb-6">
                                Xin lỗi, có gì đó không ổn. Vui lòng thử tải lại trang hoặc liên hệ với chúng tôi nếu vấn đề vẫn tiếp tục.
                            </p>

                            <button
                                onClick={this.handleReload}
                                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                            >
                                <RefreshCw className="w-5 h-5" />
                                <span>Tải lại trang</span>
                            </button>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-6 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-600 mb-2">
                                        Chi tiết lỗi (development only)
                                    </summary>
                                    <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                    {this.state.error && this.state.error.toString()}
                                        <br />
                                        {this.state.errorInfo.componentStack}
                  </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;