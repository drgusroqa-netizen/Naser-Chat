// ===== التطبيق الرئيسي =====

class NaserApp {
    constructor() {
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            // انتظار تحميل DOM
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // تهيئة المكونات
            await this.initializeComponents();
            
            // إعداد مستمعي الأحداث
            this.setupEventListeners();
            
            // التحقق من المصادقة
            await this.checkAuthentication();
            
            this.initialized = true;
            console.log('Naser App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            utils.showToast('فشل تحميل التطبيق', 'error');
        }
    }

    async initializeComponents() {
        // تهيئة حالة التطبيق إذا لم تكن موجودة
        if (!window.appState) {
            window.appState = {
                user: null,
                servers: [],
                channels: [],
                messages: [],
                members: [],
                friends: [],
                friendRequests: [],
                currentServer: null,
                currentChannel: null,
                onlineUsers: new Set(),
                typingUsers: new Map()
            };
        }

        // تهيئة مكونات الواجهة
        this.initUIComponents();
        
        // تهيئة نظام الإشعارات
        this.initNotifications();
    }

    initUIComponents() {
        // تهيئة Modals
        this.initModals();
        
        // تهيئة أزرار التبويب
        this.initTabs();
        
        // تهيئة البحث
        this.initSearch();
        
        // تهيئة سحب وإفلات الملفات
        this.initDragAndDrop();
        
        // تهيئة اختصارات لوحة المفاتيح
        this.initKeyboardShortcuts();
    }

    initModals() {
        // إغلاق Modals بالنقر خارج المحتوى
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-overlay')) {
                    utils.closeModal(modal.id);
                }
            });
        });

        // إغلاق Modals بمفتاح Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="display: block"]');
                if (openModal) {
                    utils.closeModal(openModal.id);
                }
            }
        });
    }

    initTabs() {
        // تهيئة جميع أنظمة التبويب
        document.querySelectorAll('.tab-button, .settings-tab, .friends-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                const container = e.currentTarget.closest('.tab-container, .settings-tabs, .friends-sidebar');
                
                if (!container) return;
                
                // تحديث التبويبات النشطة
                container.querySelectorAll('.tab-button, .settings-tab, .friends-tab').forEach(t => {
                    t.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
                
                // تبديل المحتوى
                container.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                const targetContent = container.querySelector(`.tab-content[data-tab="${tabId}"]`);
                if (targetContent) {
                    targetContent.style.display = 'block';
                }
            });
        });
    }

    initSearch() {
        const searchInputs = document.querySelectorAll('input[type="search"], .search-box input');
        searchInputs.forEach(input => {
            input.addEventListener('input', utils.debounce((e) => {
                this.handleSearch(e.target.value, e.target.dataset.searchType);
            }, 300));
        });
    }

    initDragAndDrop() {
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.currentTarget.classList.add('dragover');
            });
            
            messageInput.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragover');
            });
            
            messageInput.addEventListener('drop', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                this.handleFileDrop(files);
            });
        }
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K للبحث
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector('.search-box input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            
            // Ctrl/Cmd + Enter لإرسال الرسالة
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Escape لإلغاء الكتابة
            if (e.key === 'Escape') {
                const messageInput = document.getElementById('message-input');
                if (messageInput && document.activeElement === messageInput) {
                    messageInput.blur();
                }
            }
            
            // Ctrl/Cmd + / للتعليمات
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                utils.openModal('help-modal');
            }
        });
    }

    initNotifications() {
        // إعداد مستمعي أحداث الإشعارات من السوكيت
        socketService.on('notification', (data) => {
            this.handleNotification(data);
        });
    }

    async checkAuthentication() {
        const token = localStorage.getItem('naser_token') || sessionStorage.getItem('naser_token');
        
        if (token) {
            try {
                const user = await api.verifyToken();
                if (user) {
                    // تحديث حالة التطبيق
                    window.appState.user = user;
                    
                    // إظهار التطبيق الرئيسي
                    this.showMainApp();
                    
                    // الاتصال بالسوكيت
                    socketService.connect(user.id);
                    
                    // تحميل البيانات الأولية
                    await this.loadInitialData();
                    
                    return;
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
            }
        }
        
        // إذا لم يكن هناك مصادقة صالحة، عرض شاشة التسجيل
        this.showAuthScreen();
    }

    showAuthScreen() {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        
        // تحديث واجهة المستخدم
        this.updateUI();
    }

    async loadInitialData() {
        try {
            utils.showLoading('جاري تحميل البيانات...');
            
            // تحميل الخوادم
            const serversResponse = await api.getUserServers();
            if (serversResponse.success) {
                window.appState.servers = serversResponse.servers;
                this.renderServers();
            }
            
            // تحميل الأصدقاء
            const friendsResponse = await api.getFriends();
            if (friendsResponse.success) {
                window.appState.friends = friendsResponse.friends;
                this.renderFriends();
            }
            
            // تحميل طلبات الصداقة
            const requestsResponse = await api.getFriendRequests();
            if (requestsResponse.success) {
                window.appState.friendRequests = requestsResponse.requests;
                this.updateFriendRequestsBadge();
            }
            
            utils.showToast('تم تحميل البيانات بنجاح', 'success');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            utils.showToast('فشل تحميل بعض البيانات', 'warning');
        } finally {
            utils.hideLoading();
        }
    }

    setupEventListeners() {
        // ===== أحداث الخوادم =====
        document.getElementById('create-server-btn')?.addEventListener('click', () => {
            utils.openModal('create-server-modal');
        });
        
        document.getElementById('explore-servers-btn')?.addEventListener('click', () => {
            this.exploreServers();
        });
        
        // ===== أحداث القنوات =====
        document.getElementById('members-toggle-btn')?.addEventListener('click', () => {
            this.toggleMembersSidebar();
        });
        
        // ===== أحداث المحادثة =====
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
            
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        document.getElementById('send-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });
        
        document.getElementById('emoji-btn')?.addEventListener('click', () => {
            this.showEmojiPicker();
        });
        
        document.getElementById('add-attachment-btn')?.addEventListener('click', () => {
            this.triggerFileInput();
        });
        
        // ===== أحداث الإعدادات =====
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.openSettings();
        });
        
        // ===== أحداث الأصدقاء =====
        document.getElementById('add-friend-btn')?.addEventListener('click', () => {
            utils.openModal('add-friend-modal');
        });
        
        // ===== أحداث الدعوة =====
        document.getElementById('invite-btn')?.addEventListener('click', () => {
            this.openInviteModal();
        });
        
        // ===== أحداث الرسائل المثبتة =====
        document.getElementById('pins-btn')?.addEventListener('click', () => {
            this.openPinsModal();
        });
        
        // ===== أحداث الوسائط =====
        document.getElementById('mic-btn')?.addEventListener('click', () => {
            this.toggleMicrophone();
        });
        
        document.getElementById('headphones-btn')?.addEventListener('click', () => {
            this.toggleHeadphones();
        });
        
        // ===== أحداث الشبكة =====
        window.addEventListener('online', () => {
            this.handleNetworkStatusChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleNetworkStatusChange(false);
        });
        
        // ===== أحداث الصفحة =====
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });
        
        // ===== أحداث السوكيت =====
        this.setupSocketEventListeners();
    }

    setupSocketEventListeners() {
        // تحديث حالة المستخدم
        socketService.on('user_status_change', (data) => {
            this.handleUserStatusChange(data);
        });
        
        // الرسائل الجديدة
        socketService.on('new_message', (message) => {
            this.handleNewMessage(message);
        });
        
        // تحديث الرسائل
        socketService.on('message_updated', (message) => {
            this.handleMessageUpdated(message);
        });
        
        // حذف الرسائل
        socketService.on('message_deleted', (data) => {
            this.handleMessageDeleted(data);
        });
        
        // تثبيت الرسائل
        socketService.on('message_pinned', (data) => {
            this.handleMessagePinned(data);
        });
        
        // التفاعلات
        socketService.on('message_reaction_added', (data) => {
            this.handleReactionAdded(data);
        });
        
        socketService.on('message_reaction_removed', (data) => {
            this.handleReactionRemoved(data);
        });
        
        // الكتابة
        socketService.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });
        
        // الأعضاء
        socketService.on('server_member_joined', (data) => {
            this.handleServerMemberJoined(data);
        });
        
        socketService.on('server_member_left', (data) => {
            this.handleServerMemberLeft(data);
        });
        
        // الصوت
        socketService.on('user_voice_join', (data) => {
            this.handleVoiceJoin(data);
        });
        
        socketService.on('user_voice_leave', (data) => {
            this.handleVoiceLeave(data);
        });
        
        // الأصدقاء
        socketService.on('friend_request_received', (data) => {
            this.handleFriendRequestReceived(data);
        });
        
        socketService.on('friend_request_accepted', (data) => {
            this.handleFriendRequestAccepted(data);
        });
    }

    // ===== معالجة الأحداث =====
    handleSearch(query, type) {
        if (!query || query.length < 2) return;
        
        switch (type) {
            case 'messages':
                this.searchMessages(query);
                break;
            case 'friends':
                this.searchFriends(query);
                break;
            case 'servers':
                this.searchServers(query);
                break;
            default:
                this.generalSearch(query);
        }
    }

    async searchMessages(query) {
        try {
            const response = await api.searchMessages(query, window.appState.currentChannel?._id);
            if (response.success) {
                this.displaySearchResults(response.results, 'messages');
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    async searchFriends(query) {
        try {
            const response = await api.searchUsers(query);
            if (response.success) {
                this.displaySearchResults(response.users, 'users');
            }
        } catch (error) {
            console.error('Friends search error:', error);
        }
    }

    displaySearchResults(results, type) {
        // TODO: تنفيذ عرض نتائج البحث
        console.log(`Search results (${type}):`, results);
    }

    async handleFileDrop(files) {
        if (!files.length) return;
        
        const validFiles = [];
        const errors = [];
        
        for (const file of files) {
            const validation = utils.validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`${file.name}: ${validation.error}`);
            }
        }
        
        if (errors.length > 0) {
            utils.showToast(errors.join('\n'), 'error', 5000);
        }
        
        if (validFiles.length > 0) {
            await this.uploadFiles(validFiles);
        }
    }

    async uploadFiles(files) {
        const attachments = [];
        
        for (const file of files) {
            try {
                const result = await api.uploadFile(file);
                if (result.success) {
                    attachments.push({
                        url: result.url,
                        filename: file.name,
                        filetype: file.type,
                        size: file.size
                    });
                }
            } catch (error) {
                console.error('Upload error:', error);
                utils.showToast(`فشل رفع ${file.name}`, 'error');
            }
        }
        
        if (attachments.length > 0) {
            this.addAttachmentsToMessage(attachments);
        }
    }

    addAttachmentsToMessage(attachments) {
        const attachmentsList = document.getElementById('attachments-list');
        const preview = document.getElementById('attachments-preview');
        
        if (!attachmentsList || !preview) return;
        
        attachments.forEach(attachment => {
            const item = utils.createElement('div', ['attachment-item']);
            
            const isImage = attachment.filetype.startsWith('image/');
            const icon = isImage ? 'fa-image' : 'fa-file';
            
            item.innerHTML = `
                <div class="attachment-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="attachment-info">
                    <div class="attachment-name">${attachment.filename}</div>
                    <div class="attachment-size">${utils.formatFileSize(attachment.size)}</div>
                </div>
                <button class="attachment-remove" onclick="app.removeAttachment('${attachment.url}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            attachmentsList.appendChild(item);
        });
        
        preview.style.display = 'block';
        
        // إضافة المرفقات لحالة التطبيق
        if (!window.appState.pendingAttachments) {
            window.appState.pendingAttachments = [];
        }
        window.appState.pendingAttachments.push(...attachments);
    }

    removeAttachment(url) {
        // TODO: تنفيذ إزالة المرفقات
        console.log('Remove attachment:', url);
    }

    handleTyping() {
        if (!window.appState.currentChannel) return;
        
        const channelId = window.appState.currentChannel._id;
        
        // إرسال حدث الكتابة
        socketService.startTyping(channelId);
        
        // إعادة ضبط المؤقت لإيقاف الكتابة
        clearTimeout(window.appState.typingTimeout);
        window.appState.typingTimeout = setTimeout(() => {
            socketService.stopTyping(channelId);
        }, 2000);
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;
        
        const content = messageInput.value.trim();
        const attachments = window.appState.pendingAttachments || [];
        
        if (!content && attachments.length === 0) {
            utils.showToast('لا يمكن إرسال رسالة فارغة', 'warning');
            return;
        }
        
        if (!window.appState.currentChannel) {
            utils.showToast('يرجى اختيار قناة أولاً', 'warning');
            return;
        }
        
        try {
            // إرسال عبر السوكيت
            const success = socketService.sendMessage(
                window.appState.currentChannel._id,
                content,
                attachments
            );
            
            if (success) {
                // مسح حقل الإدخال
                messageInput.value = '';
                
                // مسح المرفقات
                this.clearAttachments();
                
                // إيقاف مؤشر الكتابة
                socketService.stopTyping(window.appState.currentChannel._id);
                clearTimeout(window.appState.typingTimeout);
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            utils.showToast('فشل إرسال الرسالة', 'error');
        }
    }

    clearAttachments() {
        const attachmentsList = document.getElementById('attachments-list');
        const preview = document.getElementById('attachments-preview');
        
        if (attachmentsList) attachmentsList.innerHTML = '';
        if (preview) preview.style.display = 'none';
        
        window.appState.pendingAttachments = [];
    }

    handleUserStatusChange(data) {
        const { userId, status } = data;
        
        // تحديث حالة المستخدم في القوائم
        this.updateUserStatusInLists(userId, status);
        
        // تحديث العدد المتصل في الخادم
        this.updateOnlineCount();
    }

    updateUserStatusInLists(userId, status) {
        // تحديث في قائمة الأعضاء
        document.querySelectorAll('.member-item').forEach(item => {
            const memberId = item.dataset.memberId;
            if (memberId === userId) {
                const statusElement = item.querySelector('.member-status');
                if (statusElement) {
                    statusElement.className = `member-status ${status}`;
                }
            }
        });
        
        // تحديث في قائمة الأصدقاء
        document.querySelectorAll('.friend-item').forEach(item => {
            const friendId = item.dataset.friendId;
            if (friendId === userId) {
                const statusElement = item.querySelector('.friend-status');
                if (statusElement) {
                    statusElement.className = `friend-status ${status}`;
                }
            }
        });
    }

    updateOnlineCount() {
        if (!window.appState.currentServer?.members) return;
        
        const onlineMembers = window.appState.currentServer.members.filter(
            m => m.user?.status === 'online'
        );
        
        const onlineCount = document.querySelector('.online-count');
        if (onlineCount) {
            onlineCount.textContent = onlineMembers.length;
        }
    }

    handleNewMessage(message) {
        // إذا كانت الرسالة في القناة الحالية
        if (window.appState.currentChannel?._id === message.channel) {
            this.addMessageToChat(message);
            
            // تشغيل صوت إذا لم تكن من المستخدم الحالي
            if (message.author._id !== window.appState.user?.id) {
                utils.playSound('message');
            }
        } else {
            // إشعار بالرسائل في القنوات الأخرى
            this.notifyNewMessage(message);
        }
    }

    addMessageToChat(message) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messageElement = this.createMessageElement(message);
        messagesContainer.appendChild(messageElement);
        
        // التمرير إلى الأسفل
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // إخفاء رسالة الترحيب
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    createMessageElement(message) {
        // استخدم نفس الدالة من AuthManager أو أنشئ نسخة محلية
        return authManager.createMessageElement(message);
    }

    notifyNewMessage(message) {
        // TODO: تنفيذ إشعارات الرسائل
        console.log('New message notification:', message);
    }

    handleMessageUpdated(message) {
        // تحديث الرسالة في الواجهة
        const messageElement = document.querySelector(`[data-message-id="${message._id}"]`);
        if (messageElement) {
            const contentElement = messageElement.querySelector('.message-text');
            if (contentElement) {
                contentElement.textContent = message.content;
                contentElement.innerHTML += ' <span class="edited-badge">(تم التعديل)</span>';
            }
        }
    }

    handleMessageDeleted(data) {
        // إزالة الرسالة من الواجهة
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
    }

    handleUserTyping(data) {
        const { userId, isTyping, channelId } = data;
        
        // إذا كان في القناة الحالية
        if (window.appState.currentChannel?._id === channelId) {
            this.showTypingIndicator(userId, isTyping);
        }
    }

    showTypingIndicator(userId, isTyping) {
        const indicator = document.getElementById('typing-indicator');
        const text = document.getElementById('typing-text');
        
        if (!indicator || !text) return;
        
        if (isTyping) {
            // الحصول على اسم المستخدم
            const user = this.getUserById(userId);
            const userName = user?.displayName || user?.username || 'شخص ما';
            
            text.textContent = `${userName} يكتب...`;
            indicator.style.display = 'flex';
        } else {
            indicator.style.display = 'none';
        }
    }

    getUserById(userId) {
        // البحث في الأعضاء
        if (window.appState.currentServer?.members) {
            const member = window.appState.currentServer.members.find(m => m.user?._id === userId);
            if (member) return member.user;
        }
        
        // البحث في الأصدقاء
        if (window.appState.friends) {
            return window.appState.friends.find(f => f._id === userId);
        }
        
        return null;
    }

    handleServerMemberJoined(data) {
        // تحديث قائمة الأعضاء
        console.log('Member joined:', data);
        this.loadMembers();
    }

    handleServerMemberLeft(data) {
        // تحديث قائمة الأعضاء
        console.log('Member left:', data);
        this.loadMembers();
    }

    handleVoiceJoin(data) {
        // TODO: تنفيذ صوت/فيديو
        console.log('Voice join:', data);
    }

    handleVoiceLeave(data) {
        // TODO: تنفيذ صوت/فيديو
        console.log('Voice leave:', data);
    }

    handleFriendRequestReceived(data) {
        // تحديث شارة طلبات الصداقة
        this.updateFriendRequestsBadge();
        
        // إشعار
        utils.showNotification(
            'طلب صداقة جديد',
            `${data.fromName} أرسل لك طلب صداقة`,
            'info',
            5000
        );
    }

    handleFriendRequestAccepted(data) {
        // تحديث قائمة الأصدقاء
        this.loadFriends();
        
        // إشعار
        utils.showNotification(
            'طلب صداقة مقبول',
            `${data.byName} قبل طلب صداقتك`,
            'success',
            5000
        );
    }

    handleNotification(data) {
        utils.showNotification(data.title, data.message, data.type, data.duration);
    }

    handleNetworkStatusChange(isOnline) {
        if (isOnline) {
            utils.showToast('تم استعادة الاتصال بالإنترنت', 'success');
            
            // محاولة إعادة الاتصال بالسوكيت
            if (window.appState.user) {
                socketService.connect(window.appState.user.id);
            }
        } else {
            utils.showToast('فقدان الاتصال بالإنترنت', 'warning');
        }
    }

    handleBeforeUnload(e) {
        // إعلام السوكيت بأن المستخدم سينقطع
        socketService.emit('user_disconnecting', window.appState.user?.id);
    }

    // ===== واجهة المستخدم =====
    updateUI() {
        // تحديث صورة المستخدم واسمه
        this.updateUserProfile();
        
        // تحديث شارة الإشعارات
        this.updateNotificationsBadge();
        
        // تحديث شارة طلبات الصداقة
        this.updateFriendRequestsBadge();
    }

    updateUserProfile() {
        const user = window.appState.user;
        if (!user) return;
        
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userTag = document.getElementById('user-tag');
        
        if (userAvatar) {
            userAvatar.src = user.avatar || utils.generateAvatarUrl(user.displayName || user.username);
        }
        
        if (userName) {
            userName.textContent = user.displayName || user.username;
        }
        
        if (userTag) {
            userTag.textContent = `#${user.id.slice(-4)}`;
        }
    }

    updateNotificationsBadge() {
        // TODO: تنفيذ شارة الإشعارات
        const badge = document.querySelector('#notifications-btn .badge');
        if (badge) {
            badge.textContent = '0';
        }
    }

    updateFriendRequestsBadge() {
        const count = window.appState.friendRequests?.length || 0;
        const badge = document.querySelector('#add-friend-btn .badge') || 
                     document.querySelector('#friends-tab-pending .badge');
        
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // ===== الوظائف العامة =====
    exploreServers() {
        // TODO: تنفيذ استكشاف الخوادم
        utils.showToast('ميزة الاستكشاف قريباً!', 'info');
    }

    toggleMembersSidebar() {
        const sidebar = document.querySelector('.members-container');
        if (sidebar) {
            const isVisible = sidebar.style.display !== 'none';
            sidebar.style.display = isVisible ? 'none' : 'block';
        }
    }

    showEmojiPicker() {
        utils.openModal('emoji-modal');
    }

    triggerFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,video/*,audio/*,.pdf,.txt,.doc,.docx';
        
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.handleFileDrop(files);
        };
        
        input.click();
    }

    openSettings() {
        utils.openModal('user-settings-modal');
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const user = await api.getCurrentUser();
            if (user.success) {
                this.populateSettings(user.user);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateSettings(user) {
        // TODO: تنفيذ تعبئة إعدادات المستخدم
        console.log('Populate settings for:', user);
    }

    openInviteModal() {
        if (!window.appState.currentServer) {
            utils.showToast('يرجى اختيار خادم أولاً', 'warning');
            return;
        }
        
        utils.openModal('invite-modal');
        this.loadInviteData();
    }

    async loadInviteData() {
        try {
            const response = await api.generateInviteCode(window.appState.currentServer._id);
            if (response.success) {
                this.updateInviteLink(response.inviteCode);
            }
        } catch (error) {
            console.error('Error loading invite data:', error);
        }
    }

    updateInviteLink(inviteCode) {
        const linkInput = document.getElementById('invite-link-input');
        if (linkInput) {
            const link = `${window.location.origin}/invite/${inviteCode}`;
            linkInput.value = link;
        }
    }

    async openPinsModal() {
        if (!window.appState.currentChannel) {
            utils.showToast('يرجى اختيار قناة أولاً', 'warning');
            return;
        }
        
        utils.openModal('pins-modal');
        await this.loadPinnedMessages();
    }

    async loadPinnedMessages() {
        try {
            const response = await api.getPinnedMessages(window.appState.currentChannel._id);
            if (response.success) {
                this.displayPinnedMessages(response.messages);
            }
        } catch (error) {
            console.error('Error loading pinned messages:', error);
        }
    }

    displayPinnedMessages(messages) {
        const pinsList = document.getElementById('pins-list');
        if (!pinsList) return;
        
        pinsList.innerHTML = '';
        
        messages.forEach(message => {
            const pinElement = this.createPinElement(message);
            pinsList.appendChild(pinElement);
        });
    }

    createPinElement(message) {
        // TODO: تنفيذ عرض الرسائل المثبتة
        const div = document.createElement('div');
        div.className = 'pin-item';
        div.innerHTML = `
            <div class="pin-message">${utils.escapeHtml(message.content)}</div>
            <div class="pin-meta">
                <span>بواسطة ${message.author.displayName || message.author.username}</span>
                <span>${utils.formatDateTime(message.pinnedAt)}</span>
            </div>
        `;
        return div;
    }

    toggleMicrophone() {
        // TODO: تنفيذ التحكم بالميكروفون
        const btn = document.getElementById('mic-btn');
        if (btn) {
            const isActive = btn.classList.toggle('active');
            utils.showToast(isActive ? 'تم تشغيل الميكروفون' : 'تم إيقاف الميكروفون', 'info');
        }
    }

    toggleHeadphones() {
        // TODO: تنفيذ التحكم بالسماعات
        const btn = document.getElementById('headphones-btn');
        if (btn) {
            const isActive = btn.classList.toggle('active');
            utils.showToast(isActive ? 'تم تشغيل الصوت' : 'تم إيقاف الصوت', 'info');
        }
    }

    async loadMembers() {
        if (!window.appState.currentServer) return;
        
        try {
            const response = await api.getServerMembers(window.appState.currentServer._id);
            if (response.success) {
                window.appState.members = response.members;
                this.renderMembers();
            }
        } catch (error) {
            console.error('Error loading members:', error);
        }
    }

    renderMembers() {
        const membersList = document.querySelector('.members-list');
        if (!membersList || !window.appState.members) return;
        
        membersList.innerHTML = '';
        
        window.appState.members.forEach(member => {
            const memberItem = this.createMemberElement(member);
            membersList.appendChild(memberItem);
        });
        
        // تحديث العدد
        const countElement = document.querySelector('.members-count');
        if (countElement) {
            countElement.textContent = window.appState.members.length;
        }
    }

    createMemberElement(member) {
        const user = member.user;
        const avatarUrl = user.avatar || utils.generateAvatarUrl(user.displayName || user.username);
        
        const div = document.createElement('div');
        div.className = 'member-item';
        div.dataset.memberId = user.id;
        
        div.innerHTML = `
            <div class="member-avatar">
                <img src="${avatarUrl}" alt="${user.displayName || user.username}">
                <div class="member-status ${user.status || 'offline'}"></div>
            </div>
            <div class="member-info">
                <div class="member-name">${user.displayName || user.username}</div>
                <div class="member-role">${this.getMemberRoleText(member.role)}</div>
            </div>
        `;
        
        return div;
    }

    getMemberRoleText(role) {
        const roles = {
            owner: '👑 المالك',
            admin: '⚡ مدير',
            moderator: '🛡️ مشرف',
            member: '👤 عضو'
        };
        return roles[role] || role;
    }

    async loadFriends() {
        try {
            const response = await api.getFriends();
            if (response.success) {
                window.appState.friends = response.friends;
                this.renderFriends();
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    renderFriends() {
        const friendsList = document.querySelector('.friends-list');
        if (!friendsList || !window.appState.friends) return;
        
        friendsList.innerHTML = '';
        
        window.appState.friends.forEach(friend => {
            const friendItem = this.createFriendElement(friend);
            friendsList.appendChild(friendItem);
        });
    }

    createFriendElement(friend) {
        const avatarUrl = friend.avatar || utils.generateAvatarUrl(friend.displayName || friend.username);
        
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.dataset.friendId = friend.id;
        
        div.innerHTML = `
            <div class="friend-avatar">
                <img src="${avatarUrl}" alt="${friend.displayName || friend.username}">
                <div class="friend-status ${friend.status || 'offline'}"></div>
            </div>
            <div class="friend-info">
                <div class="friend-name">${friend.displayName || friend.username}</div>
                <div class="friend-activity">${this.getFriendStatusText(friend.status)}</div>
            </div>
        `;
        
        return div;
    }

    getFriendStatusText(status) {
        const statusMap = {
            online: '🟢 متصل',
            idle: '🟡 مشغول',
            dnd: '🔴 لا تزعج',
            offline: '⚫ غير متصل'
        };
        return statusMap[status] || 'غير معروف';
    }

    async renderServers() {
        const serverList = document.querySelector('.server-list');
        if (!serverList || !window.appState.servers) return;
        
        serverList.innerHTML = '';
        
        // الخادم الرئيسي
        const homeServer = this.createServerElement({
            _id: 'home',
            name: 'الرئيسية',
            icon: null,
            isHome: true
        });
        serverList.appendChild(homeServer);
        
        // فاصل
        const separator = document.createElement('div');
        separator.className = 'server-separator';
        serverList.appendChild(separator);
        
        // الخوادم
        window.appState.servers.forEach(server => {
            const serverElement = this.createServerElement(server);
            serverList.appendChild(serverElement);
        });
        
        // زر إضافة خادم
        const addServer = document.createElement('div');
        addServer.className = 'server-item add-server';
        addServer.innerHTML = '<i class="fas fa-plus"></i>';
        addServer.addEventListener('click', () => utils.openModal('create-server-modal'));
        serverList.appendChild(addServer);
    }

    createServerElement(server) {
        const div = document.createElement('div');
        div.className = 'server-item';
        div.dataset.serverId = server._id;
        
        if (server.isHome) {
            div.innerHTML = '<i class="fas fa-home"></i>';
            div.addEventListener('click', () => this.loadHome());
        } else {
            const avatarUrl = server.icon || utils.generateAvatarUrl(server.name);
            div.innerHTML = `<img src="${avatarUrl}" alt="${server.name}">`;
            div.addEventListener('click', () => this.loadServer(server));
        }
        
        return div;
    }

    loadHome() {
        // تحميل الصفحة الرئيسية (الرسائل المباشرة)
        window.appState.currentServer = null;
        window.appState.currentChannel = null;
        
        this.updateServerView();
        this.clearChat();
    }

    async loadServer(server) {
        try {
            const response = await api.getServer(server._id);
            if (response.success) {
                window.appState.currentServer = response.server;
                this.updateServerView();
                
                // الانضمام إلى غرفة الخادم
                socketService.joinServer(server._id);
            }
        } catch (error) {
            console.error('Error loading server:', error);
            utils.showToast('فشل تحميل الخادم', 'error');
        }
    }

    updateServerView() {
        const server = window.appState.currentServer;
        
        // تحديث اسم الخادم
        const serverName = document.getElementById('server-name');
        if (serverName) {
            serverName.textContent = server ? server.name : 'الرسائل المباشرة';
        }
        
        // تحديث أيقونة الخادم
        const serverIcon = document.getElementById('server-icon-img');
        if (serverIcon) {
            if (server) {
                serverIcon.src = server.icon || utils.generateAvatarUrl(server.name);
                serverIcon.style.display = 'block';
            } else {
                serverIcon.style.display = 'none';
            }
        }
        
        // تحديث القنوات
        if (server) {
            this.loadChannels();
            this.loadMembers();
        } else {
            this.clearChannels();
            this.clearMembers();
        }
    }

    clearChat() {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="welcome-message" id="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>مرحباً في Naser! 👋</h3>
                    <p>اختر قناة لبدء المحادثة</p>
                </div>
            `;
        }
        
        const channelName = document.getElementById('channel-name');
        if (channelName) channelName.textContent = 'اختر قناة';
        
        const channelTopic = document.getElementById('channel-topic');
        if (channelTopic) channelTopic.style.display = 'none';
    }

    clearChannels() {
        const channelsContainer = document.querySelector('.channels-container');
        if (channelsContainer) {
            channelsContainer.innerHTML = '';
        }
    }

    clearMembers() {
        const membersContainer = document.querySelector('.members-container');
        if (membersContainer) {
            membersContainer.style.display = 'none';
        }
    }

    async loadChannels() {
        if (!window.appState.currentServer) return;
        
        try {
            const response = await api.getServerChannels(window.appState.currentServer._id);
            if (response.success) {
                window.appState.channels = response.channels;
                this.renderChannels();
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }

    renderChannels() {
        const channelsContainer = document.querySelector('.channels-container');
        if (!channelsContainer || !window.appState.channels) return;
        
        channelsContainer.innerHTML = '';
        
        // تجميع القنوات حسب الفئة
        const categorized = {};
        window.appState.channels.forEach(channel => {
            const category = channel.category || 'غير مصنف';
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(channel);
        });
        
        // عرض القنوات
        Object.entries(categorized).forEach(([category, channels]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'channel-category';
            
            const header = document.createElement('div');
            header.className = 'category-header';
            header.innerHTML = `
                <span>${category}</span>
                <div class="category-actions">
                    <i class="fas fa-plus"></i>
                </div>
            `;
            
            const list = document.createElement('div');
            list.className = 'channel-list';
            
            channels.sort((a, b) => a.position - b.position).forEach(channel => {
                const channelElement = this.createChannelElement(channel);
                list.appendChild(channelElement);
            });
            
            categoryDiv.appendChild(header);
            categoryDiv.appendChild(list);
            channelsContainer.appendChild(categoryDiv);
        });
    }

    createChannelElement(channel) {
        const div = document.createElement('div');
        div.className = 'channel-item';
        div.dataset.channelId = channel._id;
        
        const icon = channel.type === 'text' ? 'fa-hashtag' : 'fa-volume-up';
        div.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${channel.name}</span>
        `;
        
        div.addEventListener('click', () => this.loadChannel(channel));
        
        return div;
    }

    async loadChannel(channel) {
        window.appState.currentChannel = channel;
        this.updateChannelView();
        
        // الانضمام إلى غرفة القناة
        socketService.joinChannel(channel._id);
        
        // تحميل الرسائل
        await this.loadChannelMessages();
    }

    updateChannelView() {
        const channel = window.appState.currentChannel;
        if (!channel) return;
        
        const channelName = document.getElementById('channel-name');
        if (channelName) {
            channelName.textContent = channel.name;
        }
        
        const channelIcon = document.getElementById('channel-icon');
        if (channelIcon) {
            channelIcon.className = channel.type === 'text' ? 'fas fa-hashtag' : 'fas fa-volume-up';
        }
        
        const channelTopic = document.getElementById('channel-topic');
        if (channelTopic) {
            if (channel.topic) {
                channelTopic.textContent = channel.topic;
                channelTopic.style.display = 'block';
            } else {
                channelTopic.style.display = 'none';
            }
        }
    }

    async loadChannelMessages() {
        if (!window.appState.currentChannel) return;
        
        try {
            const response = await api.getMessages(window.appState.currentChannel._id);
            if (response.success) {
                window.appState.messages = response.messages;
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer || !window.appState.messages) return;
        
        messagesContainer.innerHTML = '';
        
        if (window.appState.messages.length === 0) {
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
            return;
        }
        
        window.appState.messages.forEach(message => {
            const messageElement = authManager.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
        
        // التمرير إلى الأسفل
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // ===== وظائف مساعدة =====
    getServerById(serverId) {
        return window.appState.servers.find(s => s._id === serverId);
    }

    getChannelById(channelId) {
        return window.appState.channels.find(c => c._id === channelId);
    }

    getMessageById(messageId) {
        return window.appState.messages.find(m => m._id === messageId);
    }

    // ===== الحالة العامة =====
    getAppState() {
        return window.appState;
    }

    isInitialized() {
        return this.initialized;
    }
}

// إنشاء وتشغيل التطبيق
const app = new NaserApp();

// تصدير للاستخدام العام
window.app = app;
