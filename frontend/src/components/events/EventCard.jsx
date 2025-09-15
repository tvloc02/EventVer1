import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Card,
    Tag,
    Button,
    Avatar,
    Tooltip,
    Badge,
    Space,
    Typography,
    Dropdown,
    Menu,
    message
} from 'antd';
import {
    CalendarOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    UserOutlined,
    EyeOutlined,
    HeartOutlined,
    ShareAltOutlined,
    MoreOutlined,
    TeamOutlined,
    StarOutlined,
    BookOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Utils
import { formatDate, formatTime, getEventStatusColor, getLocationDisplay } from '../../utils/formatters';

const { Text, Title } = Typography;
const { Meta } = Card;

const EventCard = ({
                       event,
                       featured = false,
                       compact = false,
                       showQuickActions = false,
                       className = '',
                       onClick
                   }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleCardClick = (e) => {
        // Prevent navigation when clicking on buttons or links
        if (e.target.closest('.ant-btn, .ant-dropdown, a')) {
            return;
        }

        if (onClick) {
            onClick(event);
        } else {
            navigate(`/events/${event.slug}`);
        }
    };

    const handleQuickRegister = async (e) => {
        e.stopPropagation();

        if (!user) {
            message.info('Vui lòng đăng nhập để đăng ký sự kiện');
            navigate('/login');
            return;
        }

        try {
            setLoading(true);
            // Quick registration logic here
            message.success('Đăng ký thành công!');
        } catch (error) {
            message.error('Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = (e) => {
        e.stopPropagation();

        if (navigator.share) {
            navigator.share({
                title: event.title,
                text: event.description.short,
                url: `${window.location.origin}/events/${event.slug}`
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(`${window.location.origin}/events/${event.slug}`);
            message.success('Link đã được sao chép!');
        }
    };

    const handleSaveEvent = (e) => {
        e.stopPropagation();
        // Save/unsave event logic
        message.success('Đã lưu sự kiện!');
    };

    const moreMenu = (
        <Menu>
            <Menu.Item key="save" icon={<BookOutlined />} onClick={handleSaveEvent}>
                Lưu sự kiện
            </Menu.Item>
            <Menu.Item key="share" icon={<ShareAltOutlined />} onClick={handleShare}>
                Chia sẻ
            </Menu.Item>
            <Menu.Item key="report">
                Báo cáo sự kiện
            </Menu.Item>
        </Menu>
    );

    const isEventFull = event.registration.currentParticipants >= event.registration.maxParticipants;
    const isRegistrationOpen = event.isRegistrationOpen;
    const eventStatus = event.status;
    const daysUntilEvent = dayjs(event.schedule.startDate).diff(dayjs(), 'day');

    const cardActions = showQuickActions ? [
        <Tooltip title="Xem chi tiết">
            <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/events/${event.slug}`);
                }}
            />
        </Tooltip>,
        <Tooltip title="Lưu sự kiện">
            <Button
                type="text"
                icon={<HeartOutlined />}
                onClick={handleSaveEvent}
            />
        </Tooltip>,
        <Tooltip title="Chia sẻ">
            <Button
                type="text"
                icon={<ShareAltOutlined />}
                onClick={handleShare}
            />
        </Tooltip>,
        <Dropdown overlay={moreMenu} trigger={['click']}>
            <Button
                type="text"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
            />
        </Dropdown>
    ] : undefined;

    const coverStyle = {
        height: compact ? 200 : 250,
        background: `linear-gradient(135deg, ${event.category?.color || '#1890ff'}20, ${event.category?.color || '#1890ff'}40)`,
        backgroundImage: event.images?.banner ? `url(${event.images.banner})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className={`event-card ${className}`}
        >
            <Card
                hoverable
                className={`h-full overflow-hidden ${featured ? 'border-yellow-400 border-2' : ''}`}
                cover={
                    <div
                        className="relative cursor-pointer"
                        style={coverStyle}
                        onClick={handleCardClick}
                    >
                        {featured && (
                            <Badge.Ribbon text="Nổi bật" color="gold" />
                        )}

                        {/* Status badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                            <Tag color={getEventStatusColor(eventStatus)} className="text-xs">
                                {eventStatus === 'published' ? 'Đang mở' : eventStatus}
                            </Tag>

                            {event.pricing.isFree ? (
                                <Tag color="green" className="text-xs">Miễn phí</Tag>
                            ) : (
                                <Tag color="blue" className="text-xs">
                                    {event.pricing.price?.toLocaleString()} VND
                                </Tag>
                            )}

                            {isEventFull && (
                                <Tag color="red" className="text-xs">Hết chỗ</Tag>
                            )}
                        </div>

                        {/* Quick stats */}
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <Tag icon={<EyeOutlined />} color="rgba(0,0,0,0.5)" className="text-white border-0">
                                {event.stats?.views || 0}
                            </Tag>
                            <Tag icon={<TeamOutlined />} color="rgba(0,0,0,0.5)" className="text-white border-0">
                                {event.registration?.currentParticipants || 0}/{event.registration?.maxParticipants}
                            </Tag>
                        </div>
                    </div>
                }
                actions={cardActions}
                onClick={handleCardClick}
            >
                <div className="p-0">
                    {/* Event Category */}
                    {event.category && (
                        <Tag
                            color={event.category.color}
                            className="mb-2"
                        >
                            {event.category.name}
                        </Tag>
                    )}

                    {/* Event Title */}
                    <Title
                        level={compact ? 5 : 4}
                        className="mb-2 line-clamp-2"
                        style={{ minHeight: compact ? '2.5em' : '3em' }}
                    >
                        <Link
                            to={`/events/${event.slug}`}
                            className="text-inherit hover:text-blue-500"
                        >
                            {event.title}
                        </Link>
                    </Title>

                    {/* Event Description */}
                    <Text
                        type="secondary"
                        className={`block mb-3 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}
                    >
                        {event.description.short}
                    </Text>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                            <CalendarOutlined className="mr-2" />
                            <span>{formatDate(event.schedule.startDate)}</span>
                            <span className="mx-2">•</span>
                            <ClockCircleOutlined className="mr-1" />
                            <span>{formatTime(event.schedule.startDate)}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                            <EnvironmentOutlined className="mr-2" />
                            <span className="line-clamp-1">
                {getLocationDisplay(event.location)}
              </span>
                        </div>

                        {/* Organizer */}
                        <div className="flex items-center text-sm text-gray-600">
                            <UserOutlined className="mr-2" />
                            <Avatar
                                size="small"
                                src={event.organizer?.profile?.avatar}
                                className="mr-2"
                            >
                                {event.organizer?.profile?.fullName?.charAt(0)}
                            </Avatar>
                            <span className="line-clamp-1">
                {event.organizer?.profile?.fullName}
              </span>
                        </div>
                    </div>

                    {/* Event Tags */}
                    {event.tags && event.tags.length > 0 && (
                        <div className="mb-4">
                            <Space size={[0, 4]} wrap>
                                {event.tags.slice(0, 3).map(tag => (
                                    <Tag key={tag} size="small" className="text-xs">
                                        {tag}
                                    </Tag>
                                ))}
                                {event.tags.length > 3 && (
                                    <Tag size="small" className="text-xs">
                                        +{event.tags.length - 3}
                                    </Tag>
                                )}
                            </Space>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {isRegistrationOpen && !isEventFull && (
                            <Button
                                type="primary"
                                size="small"
                                loading={loading}
                                onClick={handleQuickRegister}
                                className="flex-1"
                            >
                                Đăng ký ngay
                            </Button>
                        )}

                        {isEventFull && event.registration.waitlistEnabled && (
                            <Button
                                size="small"
                                onClick={handleQuickRegister}
                                className="flex-1"
                            >
                                Vào danh sách chờ
                            </Button>
                        )}

                        <Button
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/${event.slug}`);
                            }}
                        >
                            Chi tiết
                        </Button>
                    </div>

                    {/* Time until event */}
                    {daysUntilEvent >= 0 && (
                        <div className="mt-3 text-center">
                            <Text type="secondary" className="text-xs">
                                {daysUntilEvent === 0
                                    ? 'Hôm nay'
                                    : daysUntilEvent === 1
                                        ? 'Ngày mai'
                                        : `Còn ${daysUntilEvent} ngày`
                                }
                            </Text>
                        </div>
                    )}

                    {/* Rating */}
                    {event.stats?.averageRating > 0 && (
                        <div className="mt-2 text-center">
                            <Space size={4}>
                                <StarOutlined className="text-yellow-500" />
                                <Text className="text-sm">
                                    {event.stats.averageRating.toFixed(1)}
                                    <Text type="secondary" className="ml-1">
                                        ({event.stats.totalRatings})
                                    </Text>
                                </Text>
                            </Space>
                        </div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

export default EventCard;