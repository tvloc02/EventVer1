const { EMAIL_TEMPLATES } = require('./constants');

class EmailTemplates {
    /**
     * Get base email template
     * @param {string} content
     * @param {object} data
     * @returns {string}
     */
    static getBaseTemplate(content, data = {}) {
        return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${data.subject || 'Thông báo từ Hệ thống Quản lý Sự kiện'}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }
                .email-container {
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #007bff;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 24px;
                    font-weight: bold;
                    color: #007bff;
                    text-decoration: none;
                }
                .content {
                    padding: 20px 0;
                }
                .button {
                    display: inline-block;
                    padding: 12px 30px;
                    background-color: #007bff;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .button.danger {
                    background-color: #dc3545;
                }
                .button.success {
                    background-color: #28a745;
                }
                .button.warning {
                    background-color: #ffc107;
                    color: #212529 !important;
                }
                .info-box {
                    background-color: #f8f9fa;
                    border-left: 4px solid #007bff;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 5px 5px 0;
                }
                .warning-box {
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 5px 5px 0;
                }
                .error-box {
                    background-color: #f8d7da;
                    border-left: 4px solid #dc3545;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 5px 5px 0;
                }
                .success-box {
                    background-color: #d1ecf1;
                    border-left: 4px solid #28a745;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 5px 5px 0;
                }
                .footer {
                    text-align: center;
                    padding-top: 30px;
                    border-top: 1px solid #eee;
                    margin-top: 30px;
                    font-size: 14px;
                    color: #666;
                }
                .social-links {
                    margin: 20px 0;
                }
                .social-links a {
                    display: inline-block;
                    margin: 0 10px;
                    color: #007bff;
                    text-decoration: none;
                }
                @media only screen and (max-width: 600px) {
                    body { padding: 10px; }
                    .email-container { padding: 20px; }
                    .button { display: block; text-align: center; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <a href="${process.env.FRONTEND_URL}" class="logo">
                        🎓 Hệ thống Quản lý Sự kiện
                    </a>
                </div>
                
                <div class="content">
                    ${content}
                </div>
                
                <div class="footer">
                    <p>© 2024 Hệ thống Quản lý Sự kiện Sinh viên. Tất cả quyền được bảo lưu.</p>
                    <div class="social-links">
                        <a href="${process.env.FRONTEND_URL}">Website</a>
                        <a href="${process.env.FRONTEND_URL}/support">Hỗ trợ</a>
                        <a href="${process.env.FRONTEND_URL}/privacy">Chính sách</a>
                    </div>
                    <p style="font-size: 12px; margin-top: 20px;">
                        Nếu bạn không muốn nhận email này nữa, 
                        <a href="${process.env.FRONTEND_URL}/unsubscribe?token={{unsubscribeToken}}">hủy đăng ký tại đây</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Welcome email template
     * @param {object} user
     * @param {string} verificationToken
     * @returns {object}
     */
    static getWelcomeTemplate(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        const content = `
            <h2>🎉 Chào mừng đến với Hệ thống Quản lý Sự kiện!</h2>
            
            <p>Xin chào <strong>${user.profile?.firstName || user.username}</strong>,</p>
            
            <p>Cảm ơn bạn đã đăng ký tài khoản tại hệ thống của chúng tôi! Để bắt đầu sử dụng tất cả các tính năng, vui lòng xác thực địa chỉ email của bạn.</p>
            
            <div class="info-box">
                <p><strong>Thông tin tài khoản:</strong></p>
                <ul>
                    <li>Email: ${user.email}</li>
                    <li>Tên đăng nhập: ${user.username}</li>
                    ${user.student?.faculty ? `<li>Khoa: ${user.student.faculty}</li>` : ''}
                    ${user.student?.major ? `<li>Chuyên ngành: ${user.student.major}</li>` : ''}
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                    ✅ Xác thực Email
                </a>
            </div>
            
            <p style="margin-top: 20px;">Hoặc sao chép và dán liên kết sau vào trình duyệt:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${verificationUrl}
            </p>
            
            <div class="warning-box">
                <p><strong>Lưu ý:</strong> Liên kết xác thực sẽ hết hạn sau 24 giờ. Nếu bạn không xác thực trong thời gian này, bạn sẽ cần yêu cầu gửi lại email xác thực.</p>
            </div>
            
            <p>Sau khi xác thực email, bạn có thể:</p>
            <ul>
                <li>🔍 Tìm kiếm và xem các sự kiện</li>
                <li>📝 Đăng ký tham gia sự kiện</li>
                <li>📊 Theo dõi lịch sử tham gia</li>
                <li>🔔 Nhận thông báo về các sự kiện mới</li>
                <li>👤 Cập nhật thông tin cá nhân</li>
            </ul>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
            
            <p>Chúc bạn có những trải nghiệm tuyệt vời!</p>
        `;

        return {
            subject: 'Chào mừng bạn đến với Hệ thống Quản lý Sự kiện! 🎉',
            html: this.getBaseTemplate(content, {subject: 'Chào mừng bạn!'}),
            text: this.htmlToText(content)
        };
    }

    /**
     * Email verification template
     * @param {object} user
     * @param {string} verificationToken
     * @returns {object}
     */
    static getEmailVerificationTemplate(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        const content = `
            <h2>📧 Xác thực địa chỉ email của bạn</h2>
            
            <p>Xin chào <strong>${user.profile?.firstName || user.username}</strong>,</p>
            
            <p>Chúng tôi nhận được yêu cầu xác thực email cho tài khoản của bạn. Vui lòng nhấp vào nút bên dưới để hoàn tất quá trình xác thực:</p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">
                    ✅ Xác thực Email
                </a>
            </div>
            
            <p style="margin-top: 20px;">Hoặc sao chép và dán liên kết sau vào trình duyệt:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${verificationUrl}
            </p>
            
            <div class="warning-box">
                <p><strong>Quan trọng:</strong></p>
                <ul>
                    <li>Liên kết này sẽ hết hạn sau 24 giờ</li>
                    <li>Chỉ sử dụng liên kết này một lần</li>
                    <li>Nếu bạn không yêu cầu xác thực này, vui lòng bỏ qua email</li>
                </ul>
            </div>
        `;

        return {
            subject: 'Xác thực địa chỉ email của bạn',
            html: this.getBaseTemplate(content),
            text: this.htmlToText(content)
        };
    }

    /**
     * Password reset template
     * @param {object} user
     * @param {string} resetToken
     * @returns {object}
     */
    static getPasswordResetTemplate(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const content = `
        <h2>🔒 Đặt lại mật khẩu</h2>
        
        <p>Xin chào <strong>${user.profile?.firstName || user.username}</strong>,</p>
        
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nếu đây là yêu cầu của bạn, vui lòng nhấp vào nút bên dưới để tạo mật khẩu mới:</p>
        
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button danger">
                🔑 Đặt lại mật khẩu
            </a>
        </div>
        
        <p style="margin-top: 20px;">Hoặc sao chép và dán liên kết sau vào trình duyệt:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
            ${resetUrl}
        </p>
        
        <div class="error-box">
            <p><strong>Thông tin bảo mật:</strong></p>
            <ul>
                <li>Liên kết này chỉ có hiệu lực trong 1 giờ</li>
                <li>Liên kết chỉ có thể sử dụng một lần</li>
                <li>Yêu cầu được gửi từ IP: <code>{{requestIP}}</code></li>
                <li>Thời gian yêu cầu: <code>{{requestTime}}</code></li>
            </ul>
        </div>
        
        <div class="warning-box">
            <p><strong>Nếu bạn không yêu cầu đặt lại mật khẩu:</strong></p>
            <ul>
                <li>Vui lòng bỏ qua email này</li>
                <li>Mật khẩu của bạn sẽ không thay đổi</li>
                <li>Liên hệ với đội ngũ hỗ trợ tại <a href="${process.env.FRONTEND_URL}/support">đây</a> nếu bạn nghi ngờ có hoạt động bất thường</li>
            </ul>
        </div>
        
        <p>Nếu bạn gặp bất kỳ vấn đề nào trong quá trình đặt lại mật khẩu, vui lòng liên hệ với chúng tôi qua <a href="${process.env.FRONTEND_URL}/support">trang hỗ trợ</a>.</p>
        
        <p>Trân trọng,<br>Đội ngũ Hệ thống Quản lý Sự kiện</p>
    `;

        return {
            subject: 'Đặt lại mật khẩu cho tài khoản của bạn',
            html: this.getBaseTemplate(content, {subject: 'Đặt lại mật khẩu'}),
            text: this.htmlToText(content)
        };
    }
}