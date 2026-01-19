// ===== خدمة Socket.io =====

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
        this.userId = null;
    }

    // ===== الاتصال =====
    connect(userId) {
        if (this.isConnected && this.socket) {
            console.log('Socket already connected');
            return;
        }

        this.userId = userId;
        
        try {
            this.socket = io('http://localhost:5000', {
                transports: ['websocket', 'polling'],
                auth: {
                    token: api.getToken()
                }
            });

            this.setupEventListeners();
            this.isConnected = true;
            
            utils.showToast('تم الاتصال بالخادم', 'success');
            console.log('Socket connected successfully');
            
        } catch (error) {
            console.error('Socket connection error:', error);
            utils.showToast('فشل الاتصال بالخادم', 'error');
            this.handleReconnect();
        }
    }

    setupEventListeners() {
        if (!this.socket) return;

        // أحداث الاتصال
        this.socket.on('connect', () => {
            console.log('Socket connected with ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // إعلام الخادم بأن المستخدم متصل
            this.emit('user_online', this.userId);
            
            // إعادة الانضمام إلى الغرف النشطة
            this.rejoinActiveRooms();
            
            utils.showNotification('الاتصال', 'تم الاتصال بالخادم', 'success', 2000);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            this.isConnected = false;
            
            if (reason === 'io server disconnect') {
                // تم فصل الاتصال من الخادم، إعادة الاتصال
                this.socket.connect();
            }
            
            utils.showNotification('الاتصال', 'تم قطع الاتصال بالخادم', 'warning', 3000);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.isConnected = false;
            this.handleReconnect();
        });

        // أحداث عامة
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            utils.showToast(error.message || 'حدث خطأ في الاتصال', 'error');
        });

        // أحداث المستخدمين
        this.socket.on('user_status_change', (data) => {
            this.handleUserStatusChange(data);
        });

        // أحداث الرسائل
        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('message_updated', (message) => {
            this.handleMessageUpdated(message);
        });

        this.socket.on('message_deleted', (data) => {
            this.handleMessageDeleted(data);
        });

        this.socket.on('message_pinned', (data) => {
            this.handleMessagePinned(data);
        });

        this.socket.on('message_unpinned', (data) => {
            this.handleMessageUnpinned(data);
        });

        this.socket.on('message_reaction_added', (data) => {
            this.handleReactionAdded(data);
        });

        this.socket.on('message_reaction_removed', (data) => {
            this.handleReactionRemoved(data);
        });

        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });

        // أحداث الخوادم
        this.socket.on('server_member_joined', (data) => {
            this.handleServerMemberJoined(data);
        });

        this.socket.on('server_member_left', (data) => {
            this.handleServerMemberLeft(data);
        });

        // أحداث الصوت/الفيديو
        this.socket.on('user_voice_join', (data) => {
            this.handleVoiceJoin(data);
        });

        this.socket.on('user_voice_leave', (data) => {
            this.handleVoiceLeave(data);
        });

        this.socket.on('voice_signal', (data) => {
            this.handleVoiceSignal(data);
        });

        // أحداث الأصدقاء
        this.socket.on('friend_request_received', (data) => {
            this.handleFriendRequestReceived(data);
        });

        this.socket.on('friend_request_accepted', (data) => {
            this.handleFriendRequestAccepted(data);
        });
    }

    // ===== إعادة الاتصال =====
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            utils.showToast('فشل إعادة الاتصال، يرجى تحديث الصفحة', 'error');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (this.userId && !this.isConnected) {
                this.connect(this.userId);
            }
        }, delay);
    }

    // ===== إرسال الأحداث =====
    emit(event, data) {
        if (!this.socket || !this.isConnected) {
            console.warn('Socket not connected, cannot emit:', event);
            return false;
        }

        try {
            this.socket.emit(event, data);
            return true;
        } catch (error) {
            console.error('Error emitting socket event:', error);
            return false;
        }
    }

    // ===== تسجيل معالجي الأحداث =====
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (!this.eventHandlers.has(event)) return;
        
        const handlers = this.eventHandlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    triggerEvent(event, data) {
        if (!this.eventHandlers.has(event)) return;
        
        this.eventHandlers.get(event).forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in socket event handler for ${event}:`, error);
            }
        });
    }

    // ===== معالجة الأحداث الواردة =====
    handleUserStatusChange(data) {
        const { userId, status } = data;
        
        // تحديث حالة المستخدم في الواجهة
        this.triggerEvent('user_status_change', data);
        
        // إشعار إذا كان المستخدم صديقاً
        if (window.appState?.friends?.some(f => f.id === userId)) {
            const user = window.appState.friends.find(f => f.id === userId);
            const statusText = this.getStatusText(status);
            utils.showNotification(
                user.displayName || user.username,
                `الحالة: ${statusText}`,
                'info',
                3000
            );
        }
    }

    handleNewMessage(message) {
        // التحقق إذا كانت الرسالة في القناة الحالية
        if (window.appState.currentChannel?._id === message.channel) {
            this.triggerEvent('new_message', message);
            
            // تشغيل صوت الرسالة إذا لم تكن من المستخدم الحالي
            if (message.author._id !== window.appState.user?.id) {
                utils.playSound('message');
            }
        } else {
            // إشعار بالرسائل الجديدة في القنوات الأخرى
            this.showMessageNotification(message);
        }
    }

    handleMessageUpdated(message) {
        this.triggerEvent('message_updated', message);
    }

    handleMessageDeleted(data) {
        this.triggerEvent('message_deleted', data);
    }

    handleMessagePinned(data) {
        this.triggerEvent('message_pinned', data);
    }

    handleMessageUnpinned(data) {
        this.triggerEvent('message_unpinned', data);
    }

    handleReactionAdded(data) {
        this.triggerEvent('reaction_added', data);
    }

    handleReactionRemoved(data) {
        this.triggerEvent('reaction_removed', data);
    }

    handleUserTyping(data) {
        this.triggerEvent('user_typing', data);
    }

    handleServerMemberJoined(data) {
        this.triggerEvent('server_member_joined', data);
    }

    handleServerMemberLeft(data) {
        this.triggerEvent('server_member_left', data);
    }

    handleVoiceJoin(data) {
        this.triggerEvent('voice_join', data);
    }

    handleVoiceLeave(data) {
        this.triggerEvent('voice_leave', data);
    }

    handleVoiceSignal(data) {
        this.triggerEvent('voice_signal', data);
    }

    handleFriendRequestReceived(data) {
        utils.showNotification(
            'طلب صداقة جديد',
            `${data.fromName} أرسل لك طلب صداقة`,
            'info',
            5000
        );
        
        this.triggerEvent('friend_request_received', data);
    }

    handleFriendRequestAccepted(data) {
        utils.showNotification(
            'طلب صداقة مقبول',
            `${data.byName} قبل طلب صداقتك`,
            'success',
            5000
        );
        
        this.triggerEvent('friend_request_accepted', data);
    }

    // ===== إشعارات الرسائل =====
    showMessageNotification(message) {
        const channel = window.appState.channels?.find(c => c._id === message.channel);
        if (!channel) return;

        // التحقق من إعدادات الإشعارات
        const userSettings = window.appState.user?.settings;
        if (userSettings?.notifications === false) return;

        // التحقق من حالة التركيز (Do Not Disturb)
        if (window.appState.user?.status === 'dnd') return;

        const authorName = message.author.displayName || message.author.username;
        const channelName = channel.name;
        const messagePreview = utils.truncateText(message.content, 100);

        utils.showNotification(
            `${authorName} في #${channelName}`,
            messagePreview,
            'info',
            5000
        );
        
        utils.playSound('notification');
    }

    // ===== إدارة الغرف =====
    joinServer(serverId) {
        this.emit('join_server', serverId);
    }

    joinChannel(channelId) {
        this.emit('join_channel', channelId);
    }

    leaveChannel(channelId) {
        if (this.socket) {
            this.socket.leave(`channel_${channelId}`);
        }
    }

    leaveServer(serverId) {
        if (this.socket) {
            this.socket.leave(`server_${serverId}`);
        }
    }

    rejoinActiveRooms() {
        // إعادة الانضمام إلى الخوادم والقنوات النشطة
        if (window.appState.currentServer) {
            this.joinServer(window.appState.currentServer._id);
        }
        
        if (window.appState.currentChannel) {
            this.joinChannel(window.appState.currentChannel._id);
        }
    }

    // ===== إرسال الرسائل =====
    sendMessage(channelId, content, attachments = []) {
        return this.emit('send_message', {
            channelId,
            userId: this.userId,
            content,
            attachments
        });
    }

    startTyping(channelId) {
        this.emit('typing', {
            channelId,
            userId: this.userId,
            isTyping: true
        });
    }

    stopTyping(channelId) {
        this.emit('typing', {
            channelId,
            userId: this.userId,
            isTyping: false
        });
    }

    // ===== الصوت/الفيديو =====
    joinVoiceChannel(channelId) {
        this.emit('voice_join', {
            channelId,
            userId: this.userId
        });
    }

    leaveVoiceChannel(channelId) {
        this.emit('voice_leave', {
            channelId,
            userId: this.userId
        });
    }

    sendVoiceSignal(toSocketId, signal) {
        this.emit('voice_signal', {
            to: toSocketId,
            from: this.userId,
            signal
        });
    }

    // ===== مساعدات =====
    getStatusText(status) {
        const statusMap = {
            online: '🟢 متصل',
            idle: '🟡 مشغول',
            dnd: '🔴 لا تزعج',
            offline: '⚫ غير متصل'
        };
        return statusMap[status] || status;
    }

    // ===== الفصل =====
    disconnect() {
        if (this.socket) {
            // إعلام الخادم بأن المستخدم غير متصل
            this.emit('user_offline', this.userId);
            
            // فصل الاتصال
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.userId = null;
        this.eventHandlers.clear();
        
        console.log('Socket disconnected');
    }

    // ===== الحالة =====
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socket?.id,
            userId: this.userId,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // ===== الاختبار =====
    testConnection() {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                resolve(false);
                return;
            }

            const timeout = setTimeout(() => {
                resolve(false);
            }, 5000);

            this.socket.emit('ping', Date.now(), (response) => {
                clearTimeout(timeout);
                resolve(true);
            });
        });
    }
}

// إنشاء نسخة عامة
const socketService = new SocketService();

// تصدير للاستخدام في الملفات الأخرى
window.socketService = socketService;
