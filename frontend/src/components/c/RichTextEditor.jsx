// frontend/src/components/c/RichTextEditor.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
    Bold, Italic, Underline, List, ListOrdered,
    Link, Image, AlignLeft, AlignCenter, AlignRight,
    Quote, Code, Undo, Redo, Type, Palette,
    Eye, Edit3
} from 'lucide-react';

const RichTextEditor = ({
                            value = '',
                            onChange,
                            placeholder = 'Nhập nội dung...',
                            height = '300px',
                            readonly = false,
                            showPreview = true,
                            className = ''
                        }) => {
    const [content, setContent] = useState(value);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState({});
    const editorRef = useRef(null);

    useEffect(() => {
        setContent(value);
    }, [value]);

    useEffect(() => {
        if (onChange) {
            onChange(content);
        }
    }, [content, onChange]);

    const executeCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        updateContent();
    };

    const updateContent = () => {
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            setContent(newContent);
        }
    };

    const insertImage = () => {
        const url = prompt('Nhập URL hình ảnh:');
        if (url) {
            executeCommand('insertImage', url);
        }
    };

    const insertLink = () => {
        const url = prompt('Nhập URL liên kết:');
        if (url) {
            executeCommand('createLink', url);
        }
    };

    const changeTextColor = (color) => {
        executeCommand('foreColor', color);
    };

    const changeBackgroundColor = (color) => {
        executeCommand('hiliteColor', color);
    };

    const insertList = (ordered = false) => {
        executeCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
    };

    const formatBlock = (tag) => {
        executeCommand('formatBlock', tag);
    };

    const checkFormat = () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            setSelectedFormat({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                justifyLeft: document.queryCommandState('justifyLeft'),
                justifyCenter: document.queryCommandState('justifyCenter'),
                justifyRight: document.queryCommandState('justifyRight'),
                insertUnorderedList: document.queryCommandState('insertUnorderedList'),
                insertOrderedList: document.queryCommandState('insertOrderedList')
            });
        }
    };

    const handleKeyDown = (e) => {
        // Handle keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    executeCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    executeCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    executeCommand('underline');
                    break;
                case 'z':
                    e.preventDefault();
                    executeCommand('undo');
                    break;
                case 'y':
                    e.preventDefault();
                    executeCommand('redo');
                    break;
                default:
                    break;
            }
        }
    };

    const toolbarButtons = [
        {
            group: 'format',
            buttons: [
                {
                    command: 'bold',
                    icon: Bold,
                    title: 'In đậm (Ctrl+B)',
                    active: selectedFormat.bold
                },
                {
                    command: 'italic',
                    icon: Italic,
                    title: 'In nghiêng (Ctrl+I)',
                    active: selectedFormat.italic
                },
                {
                    command: 'underline',
                    icon: Underline,
                    title: 'Gạch chân (Ctrl+U)',
                    active: selectedFormat.underline
                }
            ]
        },
        {
            group: 'align',
            buttons: [
                {
                    command: 'justifyLeft',
                    icon: AlignLeft,
                    title: 'Căn trái',
                    active: selectedFormat.justifyLeft
                },
                {
                    command: 'justifyCenter',
                    icon: AlignCenter,
                    title: 'Căn giữa',
                    active: selectedFormat.justifyCenter
                },
                {
                    command: 'justifyRight',
                    icon: AlignRight,
                    title: 'Căn phải',
                    active: selectedFormat.justifyRight
                }
            ]
        },
        {
            group: 'list',
            buttons: [
                {
                    command: 'insertUnorderedList',
                    icon: List,
                    title: 'Danh sách dấu đầu dòng',
                    active: selectedFormat.insertUnorderedList,
                    onClick: () => insertList(false)
                },
                {
                    command: 'insertOrderedList',
                    icon: ListOrdered,
                    title: 'Danh sách số thứ tự',
                    active: selectedFormat.insertOrderedList,
                    onClick: () => insertList(true)
                }
            ]
        },
        {
            group: 'insert',
            buttons: [
                {
                    command: 'insertLink',
                    icon: Link,
                    title: 'Chèn liên kết',
                    onClick: insertLink
                },
                {
                    command: 'insertImage',
                    icon: Image,
                    title: 'Chèn hình ảnh',
                    onClick: insertImage
                },
                {
                    command: 'formatBlock',
                    icon: Quote,
                    title: 'Trích dẫn',
                    onClick: () => formatBlock('blockquote')
                },
                {
                    command: 'formatBlock',
                    icon: Code,
                    title: 'Mã nguồn',
                    onClick: () => formatBlock('pre')
                }
            ]
        },
        {
            group: 'history',
            buttons: [
                {
                    command: 'undo',
                    icon: Undo,
                    title: 'Hoàn tác (Ctrl+Z)'
                },
                {
                    command: 'redo',
                    icon: Redo,
                    title: 'Làm lại (Ctrl+Y)'
                }
            ]
        }
    ];

    const headingOptions = [
        { value: 'div', label: 'Đoạn văn bình thường' },
        { value: 'h1', label: 'Tiêu đề 1' },
        { value: 'h2', label: 'Tiêu đề 2' },
        { value: 'h3', label: 'Tiêu đề 3' },
        { value: 'h4', label: 'Tiêu đề 4' },
        { value: 'h5', label: 'Tiêu đề 5' },
        { value: 'h6', label: 'Tiêu đề 6' }
    ];

    const colors = [
        '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
        '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
    ];

    return (
        <div className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}>
            {/* Toolbar */}
            {!readonly && (
                <div className="bg-gray-50 border-b border-gray-300 p-2">
                    <div className="flex flex-wrap items-center gap-1">
                        {/* Heading Selector */}
                        <select
                            onChange={(e) => formatBlock(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 mr-2"
                        >
                            {headingOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {/* Toolbar Button Groups */}
                        {toolbarButtons.map((group, groupIndex) => (
                            <React.Fragment key={group.group}>
                                {groupIndex > 0 && <div className="w-px h-6 bg-gray-300 mx-1" />}

                                {group.buttons.map((button) => {
                                    const Icon = button.icon;
                                    return (
                                        <button
                                            key={button.command + (button.title || '')}
                                            onClick={button.onClick || (() => executeCommand(button.command))}
                                            title={button.title}
                                            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                                                button.active ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        ))}

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Color Picker */}
                        <div className="relative group">
                            <button
                                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
                                title="Màu chữ"
                            >
                                <Type className="w-4 h-4" />
                            </button>

                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 hidden group-hover:block z-10">
                                <div className="grid grid-cols-5 gap-1">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => changeTextColor(color)}
                                            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <button
                                className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-600"
                                title="Màu nền"
                            >
                                <Palette className="w-4 h-4" />
                            </button>

                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 hidden group-hover:block z-10">
                                <div className="grid grid-cols-5 gap-1">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => changeBackgroundColor(color)}
                                            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Preview Toggle */}
                        {showPreview && (
                            <>
                                <div className="w-px h-6 bg-gray-300 mx-1" />
                                <button
                                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                                    className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                                        isPreviewMode ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                                    }`}
                                    title={isPreviewMode ? 'Chế độ chỉnh sửa' : 'Xem trước'}
                                >
                                    {isPreviewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <div style={{ height }}>
                {isPreviewMode ? (
                    <div
                        className="p-4 h-full overflow-y-auto prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                ) : (
                    <div
                        ref={editorRef}
                        contentEditable={!readonly}
                        onInput={updateContent}
                        onKeyDown={handleKeyDown}
                        onMouseUp={checkFormat}
                        onKeyUp={checkFormat}
                        className={`p-4 h-full overflow-y-auto focus:outline-none ${
                            readonly ? 'bg-gray-50 cursor-not-allowed' : ''
                        }`}
                        style={{
                            minHeight: height,
                            lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                        data-placeholder={placeholder}
                    />
                )}
            </div>

            {/* Status Bar */}
            <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 text-xs text-gray-500 flex justify-between">
                <span>
                    {content.replace(/<[^>]*>/g, '').length} ký tự
                </span>
                {isPreviewMode && (
                    <span className="text-blue-600">Chế độ xem trước</span>
                )}
            </div>

            <style jsx>{`
                [contenteditable="true"]:empty:before {
                    content: attr(data-placeholder);
                    color: #9CA3AF;
                    cursor: text;
                }
                
                [contenteditable="true"]:focus:before {
                    content: none;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;