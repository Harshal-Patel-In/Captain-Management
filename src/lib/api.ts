// API client for backend communication
import { ProductsResponse, InventoryResponse, LogsResponse, StockTrendsResponse, Product, RecipeResponse, UserListItem, UserDetail, UserStats, ConversationListItem, ChatMessage, AvailableUser, ProductDailySummary } from "./types";

// Dynamic API base URL that works for both localhost and network access
const getApiBase = () => {
    // Client-side: keep requests on /api so Next.js can proxy to backend.
    if (typeof window !== 'undefined') {
        return "/api";
    }

    // Server-side: use explicit backend URL if provided.
    if (process.env.BACKEND_URL) {
        return process.env.BACKEND_URL;
    }

    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }

    return "http://127.0.0.1:8000";
};

const getDirectBackendBase = () => {
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }

    if (typeof window !== 'undefined') {
        if (window.location.protocol !== 'http:') {
            return null;
        }

        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        return `${protocol}//${hostname}:8000`;
    }

    return "http://localhost:8000";
};

class APIClient {
    private async parseError(response: Response) {
        const error = await response.json().catch(() => ({
            detail: response.statusText,
        }));

        let errorMessage = error.detail || `API Error: ${response.status}`;
        if (typeof errorMessage === 'object') {
            errorMessage = JSON.stringify(errorMessage);
        }

        return errorMessage;
    }

    private getFallbackUrl(url: string) {
        if (typeof window === 'undefined' || !url.startsWith('/api')) {
            return null;
        }

        const directBackendBase = getDirectBackendBase();
        if (!directBackendBase) {
            return null;
        }

        return `${directBackendBase}${url.slice(4)}`;
    }

    private async fetchWithFallback(url: string, options: RequestInit): Promise<Response> {
        try {
            const response = await fetch(url, options);

            const fallbackUrl = this.getFallbackUrl(url);
            if (fallbackUrl && response.status >= 500) {
                try {
                    return await fetch(fallbackUrl, options);
                } catch {
                    return response;
                }
            }

            return response;
        } catch (error) {
            const fallbackUrl = this.getFallbackUrl(url);
            if (fallbackUrl) {
                try {
                    return await fetch(fallbackUrl, options);
                } catch {
                    throw error;
                }
            }
            throw error;
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        // Calculate API_BASE on EVERY request to get correct hostname
        const API_BASE = getApiBase();
        const url = `${API_BASE}${endpoint}`;

        const requestOptions = {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        };

        const response = await this.fetchWithFallback(url, requestOptions);

        if (!response.ok) {
            const errorMessage = await this.parseError(response);
            throw new Error(errorMessage);
        }

        // Handle 204 No Content responses (e.g., DELETE operations)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null as T;
        }

        return response.json();
    }

    // Products
    async getProducts(search?: string, category?: string): Promise<ProductsResponse> {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (category) params.append("category", category);

        return this.request<ProductsResponse>(`/products?${params}`);
    }

    async getProductByQr(qr_code: string): Promise<Product | null> {
        // Use the search endpoint to find the product
        const response = await this.getProducts(qr_code);
        // Find exact match
        const product = response.products.find(p => p.qr_code_value === qr_code);
        return product || null;
    }

    async createProduct(data: {
        name: string;
        category?: string;
        qr_code_value: string;
        unit_type?: "piece" | "volume" | "mass";
        unit_label?: "pcs" | "L" | "ml" | "Kg";
    }) {
        return this.request("/products", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async updateProduct(
        id: number,
        data: {
            name?: string;
            category?: string | null;
            unit_type?: "piece" | "volume" | "mass";
        }
    ) {
        return this.request<Product>(`/products/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    }

    async deleteProduct(id: number) {
        return this.request(`/products/${id}`, {
            method: "DELETE",
        });
    }

    // Stock Operations
    async stockIn(data: { qr_code_value: string; quantity: number; remarks?: string }) {
        return this.request("/stock/in", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async stockOut(data: { qr_code_value: string; quantity: number; remarks?: string }) {
        return this.request("/stock/out", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    // Inventory
    async getInventory(search?: string, category?: string): Promise<InventoryResponse> {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (category) params.append("category", category);

        return this.request<InventoryResponse>(`/inventory?${params}`);
    }

    // Logs
    async getLogs(filters?: {
        start_date?: string;
        end_date?: string;
        product_id?: number;
        action?: "in" | "out";
    }): Promise<LogsResponse> {
        const params = new URLSearchParams();
        if (filters?.start_date) params.append("start_date", filters.start_date);
        if (filters?.end_date) params.append("end_date", filters.end_date);
        if (filters?.product_id) params.append("product_id", filters.product_id.toString());
        if (filters?.action) params.append("action", filters.action);

        return this.request<LogsResponse>(`/logs?${params}`);
    }

    // Analytics
    async getStockTrends(filters?: {
        start_date?: string;
        end_date?: string;
        low_stock_threshold?: number;
    }): Promise<StockTrendsResponse> {
        const params = new URLSearchParams();
        if (filters?.start_date) params.append("start_date", filters.start_date);
        if (filters?.end_date) params.append("end_date", filters.end_date);
        if (filters?.low_stock_threshold) {
            params.append("low_stock_threshold", filters.low_stock_threshold.toString());
        }

        return this.request<StockTrendsResponse>(`/analytics/stock-trends?${params}`);
    }

    async getProductDailySummary(product_id: number, target_date?: string): Promise<ProductDailySummary> {
        const params = new URLSearchParams();
        params.append("product_id", product_id.toString());
        if (target_date) params.append("target_date", target_date);

        return this.request<ProductDailySummary>(`/analytics/product-daily-summary?${params}`);
    }

    // Dashboard (Optimized)
    async getDashboardStats(low_stock_threshold: number = 5) {
        return this.request<{
            total_products: number;
            total_inventory: number;
            low_stock_count: number;
            active_products: number;
        }>(`/dashboard/stats?low_stock_threshold=${low_stock_threshold}`);
    }

    // CSV Exports
    getInventoryCSVUrl() {
        return `${getApiBase()}/export/inventory`;
    }

    getLogsCSVUrl(start_date?: string, end_date?: string) {
        const params = new URLSearchParams();
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        return `${getApiBase()}/export/logs?${params}`;
    }

    getAnalyticsCSVUrl(start_date?: string, end_date?: string, threshold?: number) {
        const params = new URLSearchParams();
        if (start_date) params.append("start_date", start_date);
        if (end_date) params.append("end_date", end_date);
        if (threshold) params.append("low_stock_threshold", threshold.toString());
        return `${getApiBase()}/export/analytics?${params}`;
    }
    async getRecipe(productId: number): Promise<RecipeResponse> {
        return this.request<RecipeResponse>(`/production/recipes/${productId}`);
    }

    async executeProduction(data: { product_id: number; quantity: number; custom_recipe?: any[] }): Promise<any> {
        return this.request<any>('/production/production/execute', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ============= Management API =============

    // Orders
    async getOrders(status?: string, limit: number = 50, offset: number = 0) {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        params.append("limit", limit.toString());
        params.append("offset", offset.toString());
        return this.request<any[]>(`/management/orders?${params}`);
    }

    async getOrderStats() {
        return this.request<{
            pending_count: number;
            approved_count: number;
            partially_delivered_count: number;
            fully_delivered_count: number;
            rejected_count: number;
            total_revenue: number;
            outstanding_payments: number;
        }>('/management/orders/stats');
    }

    async getOrderDetail(orderId: string) {
        return this.request<any>(`/management/orders/${orderId}`);
    }

    async approveOrder(orderId: string) {
        return this.request<any>(`/management/orders/${orderId}/approve`, {
            method: 'POST'
        });
    }

    async rejectOrder(orderId: string, reason?: string) {
        const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
        return this.request<any>(`/management/orders/${orderId}/reject${params}`, {
            method: 'POST'
        });
    }

    async getDeliveryStatus(orderId: string) {
        return this.request<any>(`/management/orders/${orderId}/delivery-status`);
    }

    async deliverItems(orderId: string, deliveries: Array<{ order_item_id: string; delivered_quantity: number; remarks?: string }>) {
        return this.request<any>(`/management/orders/${orderId}/deliver`, {
            method: 'POST',
            body: JSON.stringify({ deliveries })
        });
    }

    async recordPayment(orderId: string, data: { amount: number; payment_method: string; remarks?: string }) {
        return this.request<any>(`/management/orders/${orderId}/payment`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Products
    async getPublishableProducts() {
        return this.request<any[]>('/management/products/publishable');
    }

    async publishProduct(data: {
        source_product_id: number;
        price: number;
        description?: string;
        pack_size?: string;
        weight?: string;
        dimensions?: string;
        images?: string[];
        is_active?: boolean;
    }) {
        return this.request<any>('/management/products/publish', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getEcommerceProducts(isActive?: boolean, category?: string) {
        const params = new URLSearchParams();
        if (isActive !== undefined) params.append("is_active", isActive.toString());
        if (category) params.append("category", category);
        return this.request<any[]>(`/management/products/ecommerce?${params}`);
    }

    async getEcommerceProduct(productId: string) {
        return this.request<any>(`/management/products/ecommerce/${productId}`);
    }

    async updateEcommerceProduct(productId: string, data: {
        description?: string;
        price?: number;
        pack_size?: string;
        weight?: number;
        dimensions?: string;
        images?: string[];
        is_active?: boolean;
    }) {
        return this.request<any>(`/management/products/ecommerce/${productId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Payments
    async getPayments(orderId?: string, paymentMethod?: string, limit: number = 50) {
        const params = new URLSearchParams();
        if (orderId) params.append("order_id", orderId);
        if (paymentMethod) params.append("payment_method", paymentMethod);
        params.append("limit", limit.toString());
        return this.request<any[]>(`/management/payments?${params}`);
    }

    async getPaymentStats() {
        return this.request<any>('/management/payments/stats');
    }

    async getPaymentHistory(orderId: string) {
        return this.request<any>(`/management/payments/order/${orderId}/history`);
    }

    // Logs
    async getOrderLogs(orderId: string) {
        return this.request<{ order_id: string; timeline: any[] }>(`/management/logs/combined/${orderId}`);
    }

    // ============= User Management =============

    async getUserStats() {
        return this.request<UserStats>('/management/users/stats');
    }

    async getUsers(search?: string, status?: string, limit: number = 50) {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (status) params.append("status", status);
        params.append("limit", limit.toString());
        return this.request<UserListItem[]>(`/management/users?${params}`);
    }

    async getUserDetail(userId: string) {
        return this.request<UserDetail>(`/management/users/${userId}`);
    }

    async updateUser(userId: string, data: Partial<UserDetail>) {
        return this.request<UserDetail>(`/management/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async setUserPassword(userId: string, newPassword: string) {
        return this.request<{ success: boolean; message: string }>(`/management/users/${userId}/set-password`, {
            method: 'POST',
            body: JSON.stringify({ new_password: newPassword }),
        });
    }

    async blockUser(userId: string, blocked: boolean, reason?: string) {
        return this.request<{ success: boolean; message: string; is_active: boolean }>(`/management/users/${userId}/block`, {
            method: 'POST',
            body: JSON.stringify({ blocked, reason }),
        });
    }

    async sendUserEmail(userId: string, subject: string, message: string) {
        return this.request<{ success: boolean; message: string }>(`/management/users/${userId}/send-email`, {
            method: 'POST',
            body: JSON.stringify({ subject, message }),
        });
    }

    // ============= Chat =============

    async getAvailableUsers(search?: string) {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        return this.request<AvailableUser[]>(`/management/chat/available-users?${params}`);
    }

    async getChatConversations(search?: string) {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        return this.request<ConversationListItem[]>(`/management/chat/conversations?${params}`);
    }

    async startConversation(userId: string) {
        return this.request<ConversationListItem>(`/management/chat/conversations/${userId}`, {
            method: 'POST',
        });
    }

    async getChatMessages(conversationId: string, limit: number = 100) {
        return this.request<ChatMessage[]>(`/management/chat/conversations/${conversationId}/messages?limit=${limit}`);
    }

    async sendChatMessage(conversationId: string, content: string, messageType: string = 'text', metadataJson?: string, replyToId?: string) {
        return this.request<ChatMessage>(`/management/chat/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, message_type: messageType, metadata_json: metadataJson, reply_to_id: replyToId }),
        });
    }

    async sendChatToUser(userId: string, content: string, messageType: string = 'text', sendEmailCopy: boolean = false, metadataJson?: string, replyToId?: string) {
        const params = new URLSearchParams();
        if (sendEmailCopy) params.append("send_email_copy", "true");
        return this.request<ChatMessage>(`/management/chat/send-to-user/${userId}?${params}`, {
            method: 'POST',
            body: JSON.stringify({ content, message_type: messageType, metadata_json: metadataJson, reply_to_id: replyToId }),
        });
    }

    async addReaction(messageId: string, emoji: string) {
        return this.request<ChatMessage>(`/management/chat/messages/${messageId}/react`, {
            method: 'POST',
            body: JSON.stringify({ emoji }),
        });
    }

    async removeReaction(messageId: string, emoji: string) {
        return this.request<ChatMessage>(`/management/chat/messages/${messageId}/react`, {
            method: 'DELETE',
            body: JSON.stringify({ emoji }),
        });
    }

    async markConversationRead(conversationId: string) {
        return this.request<{ success: boolean }>(`/management/chat/conversations/${conversationId}/read`, {
            method: 'POST',
        });
    }

    async toggleConversationPin(conversationId: string) {
        return this.request<{ success: boolean; is_pinned: boolean }>(`/management/chat/conversations/${conversationId}/pin`, {
            method: 'POST',
        });
    }

    getChatWebSocketUrl() {
        // WebSocket must connect directly to the backend, NOT through Next.js proxy
        // because Next.js rewrites don't support WebSocket connections
        if (process.env.NEXT_PUBLIC_BACKEND_URL) {
            const base = process.env.NEXT_PUBLIC_BACKEND_URL;
            const wsBase = base.replace(/^http/, 'ws');
            return `${wsBase}/management/chat/ws`;
        }

        // In browser: connect to backend directly on the same hostname but port 8000
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const hostname = window.location.hostname;
            return `${protocol}//${hostname}:8000/management/chat/ws`;
        }

        return 'ws://127.0.0.1:8000/management/chat/ws';
    }
}

export const api = new APIClient();

