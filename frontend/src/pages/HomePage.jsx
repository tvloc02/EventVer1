import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Row,
    Col,
    Card,
    Button,
    Typography,
    Space,
    Tag,
    Avatar,
    List,
    Statistic
} from 'antd';
import {
    CalendarOutlined,
    UserOutlined,
    TrophyOutlined,
    BarChartOutlined,
    ArrowRightOutlined,
    EyeOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    TeamOutlined,
    StarOutlined,
    SearchOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const HomePage = () => {
    const navigate = useNavigate();

    // Mock data
    const stats = {
        totalEvents: 156,
        myEvents: 8,
        certificates: 12,
        upcomingEvents: 24
    };

    const featuredEvents = [
        {
            id: 1,
            title: 'Hội thảo Công nghệ AI 2024',
            description: 'Khám phá xu hướng mới nhất về trí tuệ nhân tạo và ứng dụng trong thực tế',
            date: '2024-03-15',
            time: '09:00',
            location: 'Hội trường A - Tòa nhà chính',
            organizer: 'Khoa Công nghệ thông tin',
            participants: 156,
            maxParticipants: 200,
            category: 'Công nghệ'
        },
        {
            id: 2,
            title: 'Cuộc thi Lập trình Olympic',
            description: 'Cuộc thi lập trình dành cho sinh viên toàn trường với giải thưởng hấp dẫn',
            date: '2024-03-20',
            time: '14:00',
            location: 'Phòng Lab 301',
            organizer: 'CLB Lập trình',
            participants: 89,
            maxParticipants: 100,
            category: 'Thi đấu'
        },
        {
            id: 3,
            title: 'Workshop Design Thinking',
            description: 'Học cách tư duy sáng tạo và giải quyết vấn đề một cách hiệu quả',
            date: '2024-03-25',
            time: '15:30',
            location: 'Phòng 205 - Tòa B',
            organizer: 'Khoa Kinh tế',
            participants: 45,
            maxParticipants: 60,
            category: 'Học thuật'
        }
    ];

    const upcomingEvents = [
        {
            id: 4,
            title: 'Seminar Khởi nghiệp',
            date: '2024-03-18',
            time: '10:00',
            location: 'Hội trường B'
        },
        {
            id: 5,
            title: 'Chương trình từ thiện',
            date: '2024-03-22',
            time: '08:00',
            location: 'Sân trường'
        },
        {
            id: 6,
            title: 'Festival Văn hóa',
            date: '2024-03-28',
            time: '18:00',
            location: 'Nhà văn hóa sinh viên'
        }
    ];

    const quickActions = [
        {
            title: 'Tạo sự kiện',
            description: 'Tạo sự kiện mới cho cộng đồng',
            icon: <CalendarOutlined />,
            color: '#1890ff',
            path: '/events/create'
        },
        {
            title: 'Tham gia sự kiện',
            description: 'Khám phá và đăng ký sự kiện',
            icon: <UserOutlined />,
            color: '#52c41a',
            path: '/events'
        },
        {
            title: 'Xem chứng nhận',
            description: 'Quản lý chứng nhận của bạn',
            icon: <TrophyOutlined />,
            color: '#faad14',
            path: '/certificates'
        },
        {
            title: 'Xem báo cáo',
            description: 'Thống kê và phân tích',
            icon: <BarChartOutlined />,
            color: '#f5222d',
            path: '/reports'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
                <div className="max-w-4xl">
                    <Title level={1} className="text-white mb-4">
                        Chào mừng đến với EventHub
                    </Title>
                    <Paragraph className="text-white/90 text-lg mb-6">
                        Nền tảng quản lý sự kiện toàn diện dành cho sinh viên.
                        Tạo, tham gia và quản lý các sự kiện một cách dễ dàng và hiệu quả.
                    </Paragraph>
                    <Space>
                        <Button
                            type="default"
                            size="large"
                            icon={<SearchOutlined />}
                            onClick={() => navigate('/events')}
                        >
                            Khám phá sự kiện
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            ghost
                            icon={<CalendarOutlined />}
                            onClick={() => navigate('/events/create')}
                        >
                            Tạo sự kiện mới
                        </Button>
                    </Space>
                </div>
            </div>

            {/* Statistics */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Tổng sự kiện"
                            value={stats.totalEvents}
                            prefix={<CalendarOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Sự kiện của tôi"
                            value={stats.myEvents}
                            prefix={<UserOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Chứng nhận"
                            value={stats.certificates}
                            prefix={<TrophyOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card>
                        <Statistic
                            title="Sắp diễn ra"
                            value={stats.upcomingEvents}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Card title="Thao tác nhanh" extra={<Link to="/dashboard">Xem tất cả <ArrowRightOutlined /></Link>}>
                <Row gutter={[16, 16]}>
                    {quickActions.map((action, index) => (
                        <Col xs={12} sm={6} key={index}>
                            <Card
                                hoverable
                                className="text-center h-full cursor-pointer"
                                onClick={() => navigate(action.path)}
                            >
                                <div className="mb-4">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl text-white"
                                        style={{ backgroundColor: action.color }}
                                    >
                                        {action.icon}
                                    </div>
                                </div>
                                <Title level={4} className="mb-2">{action.title}</Title>
                                <Paragraph type="secondary" className="text-sm">
                                    {action.description}
                                </Paragraph>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* Featured Events */}
            <Card
                title={
                    <span>
            <StarOutlined className="mr-2 text-yellow-500" />
            Sự kiện nổi bật
          </span>
                }
                extra={<Link to="/events">Xem tất cả <ArrowRightOutlined /></Link>}
            >
                <Row gutter={[16, 16]}>
                    {featuredEvents.map(event => (
                        <Col xs={24} sm={12} lg={8} key={event.id}>
                            <Card
                                hoverable
                                cover={
                                    <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                        <CalendarOutlined className="text-4xl text-blue-600" />
                                    </div>
                                }
                                actions={[
                                    <EyeOutlined key="view" onClick={() => navigate(`/events/${event.id}`)} />,
                                    <UserOutlined key="register" />,
                                    <TeamOutlined key="attendees" />
                                ]}
                            >
                                <Card.Meta
                                    title={
                                        <Link
                                            to={`/events/${event.id}`}
                                            className="text-gray-800 hover:text-blue-600"
                                        >
                                            {event.title}
                                        </Link>
                                    }
                                    description={
                                        <div className="space-y-2">
                                            <Paragraph ellipsis={{ rows: 2 }} className="text-gray-600">
                                                {event.description}
                                            </Paragraph>

                                            <div className="text-sm text-gray-500 space-y-1">
                                                <div className="flex items-center">
                                                    <CalendarOutlined className="mr-2" />
                                                    {new Date(event.date).toLocaleDateString('vi-VN')} - {event.time}
                                                </div>
                                                <div className="flex items-center">
                                                    <EnvironmentOutlined className="mr-2" />
                                                    {event.location}
                                                </div>
                                                <div className="flex items-center">
                                                    <TeamOutlined className="mr-2" />
                                                    {event.participants}/{event.maxParticipants} người
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3">
                                                <Tag color="blue">{event.category}</Tag>
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    onClick={() => navigate(`/events/${event.id}`)}
                                                >
                                                    Chi tiết
                                                </Button>
                                            </div>
                                        </div>
                                    }
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* Upcoming Events */}
            <Row gutter={16}>
                <Col xs={24} lg={16}>
                    <Card
                        title={
                            <span>
                <ClockCircleOutlined className="mr-2 text-blue-500" />
                Sự kiện sắp tới
              </span>
                        }
                        extra={<Link to="/events">Xem tất cả</Link>}
                    >
                        <List
                            dataSource={upcomingEvents}
                            renderItem={event => (
                                <List.Item
                                    actions={[
                                        <Button
                                            type="link"
                                            onClick={() => navigate(`/events/${event.id}`)}
                                        >
                                            Chi tiết
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Avatar icon={<CalendarOutlined />} className="bg-blue-600" />
                                        }
                                        title={
                                            <Link to={`/events/${event.id}`}>
                                                {event.title}
                                            </Link>
                                        }
                                        description={
                                            <Space>
                                                <Tag icon={<ClockCircleOutlined />}>
                                                    {new Date(event.date).toLocaleDateString('vi-VN')} {event.time}
                                                </Tag>
                                                <Tag icon={<EnvironmentOutlined />}>
                                                    {event.location}
                                                </Tag>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Hoạt động gần đây">
                        <List
                            size="small"
                            dataSource={[
                                'Bạn đã đăng ký tham gia "Workshop React"',
                                'Sự kiện "Hội thảo AI" đã được tạo',
                                'Bạn đã nhận chứng nhận "JavaScript Basics"',
                                'Có 3 sự kiện mới được thêm vào'
                            ]}
                            renderItem={item => (
                                <List.Item>
                                    <Typography.Text>{item}</Typography.Text>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default HomePage;