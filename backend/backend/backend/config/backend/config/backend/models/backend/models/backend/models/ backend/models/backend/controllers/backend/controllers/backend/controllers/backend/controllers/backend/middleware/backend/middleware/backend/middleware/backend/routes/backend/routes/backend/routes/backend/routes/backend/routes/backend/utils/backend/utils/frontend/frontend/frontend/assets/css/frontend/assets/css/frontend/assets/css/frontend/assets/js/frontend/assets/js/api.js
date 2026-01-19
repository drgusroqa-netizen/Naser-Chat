// ===== API Service =====

class APIService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('naser_token');
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (this.token) {
            this.headers['Authorization'] = `Bearer ${this.token}`;
        }
    }

    // ===== طرق HTTP الأساسية =====
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                ...this.headers,
                ...options.headers
            },
            ...options
        };

        try {
            utils.showLoading();
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw utils.handleError(error, `API ${endpoint}`);
        } finally {
            utils.hideLoading();
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ===== المصادقة =====
    async login(email, password) {
        try {
            const data = await this.post('/auth/login', { email, password });
            
            if (data.success) {
                this.setToken(data.token);
                return data.user;
            }
            
            throw new Error(data.error || 'فشل تسجيل الدخول');
        } catch (error) {
            throw error;
        }
    }

    async register(username, email, password, displayName = '') {
        try {
            const data = await this.post('/auth/register', {
                username,
                email,
                password,
                displayName: displayName || username
            });
            
            if (data.success) {
                this.setToken(data.token);
                return data.user;
            }
            
            throw new Error(data.error || 'فشل إنشاء الحساب');
        } catch (error) {
            throw error;
        }
    }

    async verifyToken() {
        try {
            const data = await this.get('/auth/verify');
            return data.success ? data.user : null;
        } catch (error) {
            this.clearToken();
            return null;
        }
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } finally {
            this.clearToken();
        }
    }

    // ===== إدارة التوكن =====
    setToken(token) {
        this.token = token;
        this.headers['Authorization'] = `Bearer ${token}`;
        localStorage.setItem('naser_token', token);
    }

    clearToken() {
        this.token = null;
        delete this.headers['Authorization'];
        localStorage.removeItem('naser_token');
    }

    getToken() {
        return this.token;
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ===== المستخدمين =====
    async getCurrentUser() {
        return this.get('/auth/me');
    }

    async updateProfile(profileData) {
        return this.put('/auth/profile', profileData);
    }

    async changePassword(currentPassword, newPassword) {
        return this.put('/auth/password', { currentPassword, newPassword });
    }

    async searchUsers(query) {
        return this.get(`/users/search/${encodeURIComponent(query)}`);
    }

    async getUserById(userId) {
        return this.get(`/users/${userId}`);
    }

    async sendFriendRequest(userId) {
        return this.post(`/users/${userId}/friend-request`);
    }

    async getFriendRequests() {
        return this.get('/users/friend-requests/incoming');
    }

    async acceptFriendRequest(requestId) {
        return this.post(`/users/friend-requests/${requestId}/accept`);
    }

    async rejectFriendRequest(requestId) {
        return this.post(`/users/friend-requests/${requestId}/reject`);
    }

    async getFriends() {
        return this.get('/users/friends/list');
    }

    async removeFriend(friendId) {
        return this.delete(`/users/friends/${friendId}`);
    }

    async updateUserSettings(settings) {
        return this.put('/users/settings', settings);
    }

    // ===== الخوادم =====
    async createServer(name, description = '') {
        return this.post('/servers', { name, description });
    }

    async getUserServers() {
        return this.get('/servers/my');
    }

    async getServer(serverId) {
        return this.get(`/servers/${serverId}`);
    }

    async updateServer(serverId, data) {
        return this.put(`/servers/${serverId}`, data);
    }

    async deleteServer(serverId) {
        return this.delete(`/servers/${serverId}`);
    }

    async joinServer(inviteCode) {
        return this.post('/servers/join', { inviteCode });
    }

    async leaveServer(serverId) {
        return this.post(`/servers/${serverId}/leave`);
    }

    async getServerMembers(serverId) {
        return this.get(`/servers/${serverId}/members`);
    }

    async updateMemberRole(serverId, memberId, role) {
        return this.put(`/servers/${serverId}/members/role`, { memberId, role });
    }

    async generateInviteCode(serverId) {
        return this.post(`/servers/${serverId}/invite`);
    }

    // ===== القنوات =====
    async createChannel(serverId, channelData) {
        return this.post(`/channels/server/${serverId}`, channelData);
    }

    async getServerChannels(serverId) {
        return this.get(`/channels/server/${serverId}`);
    }

    async getChannel(channelId) {
        return this.get(`/channels/${channelId}`);
    }

    async updateChannel(channelId, data) {
        return this.put(`/channels/${channelId}`, data);
    }

    async deleteChannel(channelId) {
        return this.delete(`/channels/${channelId}`);
    }

    async updateChannelPosition(channels) {
        return this.put('/channels/reorder', { channels });
    }

    async addUserToChannel(channelId, userId) {
        return this.post(`/channels/${channelId}/users`, { userId });
    }

    async removeUserFromChannel(channelId, userId) {
        return this.delete(`/channels/${channelId}/users`, { userId });
    }

    // ===== الرسائل =====
    async sendMessage(channelId, content, attachments = []) {
        return this.post(`/messages/channel/${channelId}`, {
            content,
            attachments
        });
    }

    async getMessages(channelId, limit = 50, before = null) {
        const params = { limit };
        if (before) params.before = before;
        return this.get(`/messages/channel/${channelId}`, params);
    }

    async editMessage(messageId, content) {
        return this.put(`/messages/${messageId}`, { content });
    }

    async deleteMessage(messageId) {
        return this.delete(`/messages/${messageId}`);
    }

    async pinMessage(messageId) {
        return this.post(`/messages/${messageId}/pin`);
    }

    async unpinMessage(messageId) {
        return this.post(`/messages/${messageId}/unpin`);
    }

    async getPinnedMessages(channelId) {
        return this.get(`/messages/channel/${channelId}/pinned`);
    }

    async addReaction(messageId, emoji) {
        return this.post(`/messages/${messageId}/reactions`, { emoji });
    }

    async removeReaction(messageId, emoji) {
        return this.delete(`/messages/${messageId}/reactions`, { emoji });
    }

    async searchMessages(query, channelId = null) {
        const params = { query };
        if (channelId) params.channelId = channelId;
        return this.get('/messages/search', params);
    }

    // ===== الملفات =====
    async uploadFile(file, type = 'attachment') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            utils.showLoading('جاري رفع الملف...');
            const response = await fetch(`${this.baseURL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'فشل رفع الملف');
            }

            return data;
        } catch (error) {
            throw utils.handleError(error, 'File Upload');
        } finally {
            utils.hideLoading();
        }
    }

    // ===== الصحة =====
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // ===== معالجة الأخطاء العامة =====
    async handleApiError(error) {
        if (error.response?.status === 401) {
            // غير مصرح - تسجيل الخروج
            this.clearToken();
            window.location.reload();
            return 'انتهت جلستك، يرجى تسجيل الدخول مرة أخرى';
        }
        
        if (error.response?.status === 403) {
            return 'ليس لديك صلاحية لهذا الإجراء';
        }
        
        if (error.response?.status === 404) {
            return 'لم يتم العثور على المورد المطلوب';
        }
        
        if (error.response?.status === 429) {
            return 'لقد تجاوزت الحد المسموح، يرجى الانتظار قليلاً';
        }
        
        if (error.response?.status >= 500) {
            return 'حدث خطأ في السيرفر، يرجى المحاولة لاحقاً';
        }
        
        return error.message || 'حدث خطأ غير متوقع';
    }
}

// إنشاء نسخة عامة
const api = new APIService();

// تصدير للاستخدام في الملفات الأخرى
window.api = api;
