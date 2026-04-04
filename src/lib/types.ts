// API types matching backend schemas

export interface Product {
    id: number;
    name: string;
    category: string | null;
    qr_code_value: string;
    unit_type: "piece" | "volume" | "mass";
    unit_label: "pcs" | "L" | "ml" | "Kg";
    created_at: string;
}

export interface InventoryItem {
    product_id: number;
    product_name: string;
    category: string | null;
    qr_code_value: string;
    unit_type: "piece" | "volume" | "mass";
    unit_label: "pcs" | "L" | "ml" | "Kg";
    quantity: number;
    last_updated: string;
}

export interface StockLog {
    id: number;
    product_id: number;
    product_name: string;
    action: "in" | "out";
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    timestamp: string;
    remarks: string | null;
}

export interface StockOperationRequest {
    qr_code_value: string;
    quantity: number;
    remarks?: string;
}

export interface DailyStockData {
    date: string;
    quantity: number;
}

export interface ProductActivity {
    product_id: number;
    product_name: string;
    log_count: number;
    total_in: number;
    total_out: number;
}

export interface LowStockProduct {
    product_id: number;
    product_name: string;
    category: string | null;
    quantity: number;
}

export interface StockTrends {
    daily_stock_in: DailyStockData[];
    daily_stock_out: DailyStockData[];
    net_stock_change: DailyStockData[];
    most_active_products: ProductActivity[];
    low_stock_products: LowStockProduct[];
}

// API Response types
export interface ProductsResponse {
    products: Product[];
    total: number;
}

export interface InventoryResponse {
    items: InventoryItem[];
    total: number;
}

export interface LogsResponse {
    logs: StockLog[];
}

export interface StockTrendsResponse extends StockTrends { }

export interface ProductDailySummary {
    product_id: number;
    date: string;
    stock_in: number;
    stock_out: number;
    net_change: number;
}

export interface ProductMonthlySummary {
    product_id: number;
    period_start: string;
    period_end: string;
    stock_in: number;
    stock_out: number;
    net_change: number;
}

export interface LowStockMonthlySummaryItem {
    product_id: number;
    product_name: string;
    category: string | null;
    unit_label: string;
    quantity: number;
    stock_in: number;
    stock_out: number;
    net_change: number;
}

export interface LowStockMonthlySummaryResponse {
    period_start: string;
    period_end: string;
    items: LowStockMonthlySummaryItem[];
}

// Recipe Types
export interface RecipeItem {
    id?: number;
    ingredient_id: number;
    quantity: number; // Amount needed per 1 unit of product
    // Extended for UI convenience
    ingredient?: Product;
}

export interface RecipeResponse {
    product_id: number;
    items: RecipeItem[];
}

export interface ProductionRequest {
    product_id: number;
    quantity: number;
    custom_recipe?: {
        ingredient_id: number;
        quantity: number;
    }[];
}

// ============= User Management Types =============

export interface UserListItem {
    id: string;
    full_name: string | null;
    email: string;
    phone_number: string | null;
    city: string | null;
    state: string | null;
    is_active: boolean;
    is_verified: boolean;
    is_onboarding_completed: boolean;
    orders_count: number;
    total_spent: number;
    created_at: string;
    updated_at: string | null;
}

export interface UserDetail extends UserListItem {
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
    country: string | null;
}

export interface UserStats {
    total_users: number;
    active_users: number;
    verified_users: number;
    blocked_users: number;
    new_users_this_month: number;
}

// ============= Chat Types =============

export interface ConversationListItem {
    id: string;
    user_id: string;
    user_name: string | null;
    user_email: string;
    user_phone: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count: number;
    is_pinned: boolean;
    created_at: string;
}

export interface ReplyPreview {
    id: string;
    content: string;
    is_admin: boolean;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    is_admin: boolean;
    message_type: string;
    content: string;
    metadata_json: string | null;
    reply_to_id: string | null;
    reply_to: ReplyPreview | null;
    reactions: Record<string, number>;
    is_read: boolean;
    created_at: string;
}

export interface AvailableUser {
    id: string;
    full_name: string | null;
    email: string;
    phone_number: string | null;
    city: string | null;
    has_conversation: boolean;
}

