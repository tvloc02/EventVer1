const attendanceService = require('../../services/events/attendanceService');
const { validationResult } = require('express-validator');
const logger = require('../../utils/logger');

class AttendanceController {
    // Record attendance (check-in)
    async recordAttendance(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const attendanceData = {
                event: req.body.eventId,
                registration: req.body.registrationId,
                user: req.body.userId || req.user.userId,
                checkIn: {
                    method: req.body.method || 'manual',
                    location: req.body.location,
                    deviceInfo: {
                        userAgent: req.get('User-Agent'),
                        ipAddress: req.ip,
                        platform: req.body.platform
                    },
                    verifiedBy: req.user.userId,
                    qrCode: req.body.qrCode,
                    notes: req.body.notes
                },
                expectedDuration: req.body.expectedDuration
            };

            const attendance = await attendanceService.recordAttendance(attendanceData);

            res.status(201).json({
                success: true,
                message: 'Attendance recorded successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Record attendance controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to record attendance'
            });
        }
    }

    // Update attendance (check-out)
    async updateAttendance(req, res) {
        try {
            const { attendanceId } = req.params;
            const updateData = {
                checkOut: {
                    method: req.body.method || 'manual',
                    location: req.body.location,
                    verifiedBy: req.user.userId,
                    notes: req.body.notes
                }
            };

            const attendance = await attendanceService.updateAttendance(attendanceId, updateData);

            res.json({
                success: true,
                message: 'Attendance updated successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Update attendance controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update attendance'
            });
        }
    }

    // Get event attendance
    async getEventAttendance(req, res) {
        try {
            const { eventId } = req.params;
            const options = {
                status: req.query.status,
                includeEngagement: req.query.includeEngagement === 'true'
            };

            const attendance = await attendanceService.getEventAttendance(eventId, options);

            res.json({
                success: true,
                data: attendance
            });

        } catch (error) {
            logger.error('Get event attendance controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get event attendance'
            });
        }
    }

    // Get user attendance
    async getUserAttendance(req, res) {
        try {
            const userId = req.params.userId || req.user.userId;
            const options = {
                eventId: req.query.eventId,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const attendance = await attendanceService.getUserAttendance(userId, options);

            res.json({
                success: true,
                data: attendance
            });

        } catch (error) {
            logger.error('Get user attendance controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user attendance'
            });
        }
    }

    // Get attendance statistics
    async getAttendanceStats(req, res) {
        try {
            const { eventId } = req.params;
            const stats = await attendanceService.getAttendanceStatistics(eventId);

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Get attendance stats controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get attendance statistics'
            });
        }
    }

    // QR code check-in
    async qrCheckIn(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { qrCode } = req.body;
            const checkInData = {
                method: 'qr_code',
                location: req.body.location,
                deviceInfo: {
                    userAgent: req.get('User-Agent'),
                    ipAddress: req.ip,
                    platform: req.body.platform
                },
                verifiedBy: req.user.userId
            };

            const attendance = await attendanceService.qrCheckIn(qrCode, checkInData);

            res.json({
                success: true,
                message: 'QR check-in successful',
                data: attendance
            });

        } catch (error) {
            logger.error('QR check-in controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'QR check-in failed'
            });
        }
    }

    // Bulk check-in
    async bulkCheckIn(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { registrationIds, eventId } = req.body;
            const checkInData = {
                method: 'manual',
                verifiedBy: req.user.userId,
                location: req.body.location,
                notes: req.body.notes || 'Bulk check-in'
            };

            const results = await attendanceService.bulkCheckIn(eventId, registrationIds, checkInData);

            res.json({
                success: true,
                message: `Bulk check-in completed: ${results.successful} successful, ${results.failed} failed`,
                data: results
            });

        } catch (error) {
            logger.error('Bulk check-in controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Bulk check-in failed'
            });
        }
    }

    // Add session attendance
    async addSessionAttendance(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { attendanceId } = req.params;
            const sessionData = {
                sessionId: req.body.sessionId,
                sessionTitle: req.body.sessionTitle,
                checkIn: {
                    timestamp: new Date(req.body.checkInTime || Date.now()),
                    method: req.body.method || 'manual',
                    verifiedBy: req.user.userId
                },
                notes: req.body.notes
            };

            const attendance = await attendanceService.addSessionAttendance(attendanceId, sessionData);

            res.json({
                success: true,
                message: 'Session attendance added successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Add session attendance controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to add session attendance'
            });
        }
    }

    // Update session attendance (check-out)
    async updateSessionAttendance(req, res) {
        try {
            const { attendanceId, sessionId } = req.params;
            const sessionData = {
                checkOut: {
                    timestamp: new Date(req.body.checkOutTime || Date.now()),
                    method: req.body.method || 'manual',
                    verifiedBy: req.user.userId
                }
            };

            const attendance = await attendanceService.updateSessionAttendance(attendanceId, sessionId, sessionData);

            res.json({
                success: true,
                message: 'Session attendance updated successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Update session attendance controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update session attendance'
            });
        }
    }

    // Update engagement metrics
    async updateEngagement(req, res) {
        try {
            const { attendanceId } = req.params;
            const engagementData = {
                questionsAsked: req.body.questionsAsked,
                pollsParticipated: req.body.pollsParticipated,
                chatMessages: req.body.chatMessages,
                networkingConnections: req.body.networkingConnections
            };

            const attendance = await attendanceService.updateEngagement(attendanceId, engagementData);

            res.json({
                success: true,
                message: 'Engagement metrics updated successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Update engagement controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update engagement metrics'
            });
        }
    }

    // Flag attendance issue
    async flagAttendance(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { attendanceId } = req.params;
            const flagData = {
                type: req.body.type,
                description: req.body.description,
                severity: req.body.severity || 'medium'
            };

            const attendance = await attendanceService.flagAttendance(attendanceId, flagData);

            res.json({
                success: true,
                message: 'Attendance flagged successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Flag attendance controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to flag attendance'
            });
        }
    }

    // Resolve attendance flag
    async resolveFlaggedAttendance(req, res) {
        try {
            const { attendanceId, flagId } = req.params;
            const attendance = await attendanceService.resolveFlaggedAttendance(
                attendanceId,
                flagId,
                req.user.userId
            );

            res.json({
                success: true,
                message: 'Attendance flag resolved successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Resolve flagged attendance controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to resolve attendance flag'
            });
        }
    }

    // Get duplicate check-ins
    async getDuplicateCheckIns(req, res) {
        try {
            const { eventId } = req.params;
            const timeWindow = parseInt(req.query.timeWindow) || 5; // minutes

            const duplicates = await attendanceService.findDuplicateCheckIns(eventId, timeWindow);

            res.json({
                success: true,
                data: duplicates
            });

        } catch (error) {
            logger.error('Get duplicate check-ins controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get duplicate check-ins'
            });
        }
    }

    // Export attendance data
    async exportAttendance(req, res) {
        try {
            const { eventId } = req.params;
            const { format = 'xlsx' } = req.query;
            const options = {
                status: req.query.status,
                includeEngagement: req.query.includeEngagement === 'true',
                includeSessions: req.query.includeSessions === 'true'
            };

            const attendance = await attendanceService.getEventAttendance(eventId, options);

            const exportService = require('../../services/analytics/exportService');
            const fileBuffer = await exportService.exportAttendance(attendance, format);

            const filename = `attendance_${eventId}_${Date.now()}.${format}`;

            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-Type', exportService.getContentType(format));

            res.send(fileBuffer);

        } catch (error) {
            logger.error('Export attendance controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Export failed'
            });
        }
    }

    // Import attendance data
    async importAttendance(req, res) {
        try {
            const { eventId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const importService = require('../../services/analytics/importService');
            const result = await importService.importAttendance(eventId, req.file.buffer, req.user.userId);

            res.json({
                success: true,
                message: 'Attendance imported successfully',
                data: {
                    imported: result.imported,
                    failed: result.failed,
                    errors: result.errors
                }
            });

        } catch (error) {
            logger.error('Import attendance controller error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Import failed'
            });
        }
    }

    // Generate attendance report
    async generateAttendanceReport(req, res) {
        try {
            const { eventId } = req.params;
            const options = {
                format: req.query.format || 'summary',
                includeCharts: req.query.includeCharts === 'true',
                includeTrends: req.query.includeTrends === 'true'
            };

            const report = await attendanceService.generateAttendanceReport(eventId, options);

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            logger.error('Generate attendance report controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate attendance report'
            });
        }
    }

    // Real-time attendance tracking
    async getRealtimeAttendance(req, res) {
        try {
            const { eventId } = req.params;

            // Set up SSE (Server-Sent Events) for real-time updates
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });

            const sendUpdate = async () => {
                try {
                    const stats = await attendanceService.getAttendanceStatistics(eventId);
                    const recentAttendance = await attendanceService.getRecentAttendance(eventId, 10);

                    const data = {
                        timestamp: new Date().toISOString(),
                        stats,
                        recentAttendance
                    };

                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                } catch (error) {
                    logger.error('Real-time attendance update error:', error);
                }
            };

            // Send initial data
            await sendUpdate();

            // Set up periodic updates
            const interval = setInterval(sendUpdate, 30000); // Every 30 seconds

            // Clean up on disconnect
            req.on('close', () => {
                clearInterval(interval);
            });

            req.on('aborted', () => {
                clearInterval(interval);
            });

        } catch (error) {
            logger.error('Real-time attendance controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start real-time attendance tracking'
            });
        }
    }

    // Verify attendance certificate eligibility
    async verifyCertificateEligibility(req, res) {
        try {
            const { attendanceId } = req.params;
            const result = await attendanceService.verifyCertificateEligibility(attendanceId);

            res.json({
                success: true,
                data: {
                    eligible: result.eligible,
                    reason: result.reason,
                    attendanceRate: result.attendanceRate,
                    requirements: result.requirements
                }
            });

        } catch (error) {
            logger.error('Verify certificate eligibility controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to verify certificate eligibility'
            });
        }
    }

    // Get attendance analytics
    async getAttendanceAnalytics(req, res) {
        try {
            const { eventId } = req.params;
            const { timeframe = '1d', metrics = 'basic' } = req.query;

            const analytics = await attendanceService.getAttendanceAnalytics(eventId, {
                timeframe,
                metrics
            });

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            logger.error('Get attendance analytics controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get attendance analytics'
            });
        }
    }

    // Update late arrival status
    async updateLateArrival(req, res) {
        try {
            const { attendanceId } = req.params;
            const { acceptedByOrganizer, reason } = req.body;

            const attendance = await attendanceService.updateLateArrival(
                attendanceId,
                acceptedByOrganizer,
                reason
            );

            res.json({
                success: true,
                message: 'Late arrival status updated successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Update late arrival controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update late arrival status'
            });
        }
    }

    // Record early leave
    async recordEarlyLeave(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { attendanceId } = req.params;
            const { reason, acceptedByOrganizer } = req.body;

            const attendance = await attendanceService.recordEarlyLeave(
                attendanceId,
                reason,
                acceptedByOrganizer
            );

            res.json({
                success: true,
                message: 'Early leave recorded successfully',
                data: attendance
            });

        } catch (error) {
            logger.error('Record early leave controller error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to record early leave'
            });
        }
    }

    // Get attendance health check
    async getAttendanceHealthCheck(req, res) {
        try {
            const { eventId } = req.params;
            const healthCheck = await attendanceService.getAttendanceHealthCheck(eventId);

            res.json({
                success: true,
                data: healthCheck
            });

        } catch (error) {
            logger.error('Get attendance health check controller error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get attendance health check'
            });
        }
    }
}

module.exports = new AttendanceController();