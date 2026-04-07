"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { ConversationListItem, ChatMessage, AvailableUser } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Search, Send, ArrowLeft, Pin, PinOff, MessageSquare, Tag, Percent, Mail,
    CheckCheck, Check, Phone, MailIcon, Plus, Reply, X, Smile,
} from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/utils";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Constants ───

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// ─── Helpers ───

function formatTime(dateString: string) {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    return formatDateDDMMYYYY(d);
}

function formatMessageTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

function getInitial(name: string | null, email: string) {
    return (name || email).charAt(0).toUpperCase();
}

// ─── Message Types ───

const MESSAGE_TYPES = [
    { value: "text", label: "Text", icon: MessageSquare },
    { value: "product_update", label: "Product", icon: Tag },
    { value: "discount_update", label: "Discount", icon: Percent },
];

// ─── New Chat Dialog ───

function NewChatDialog({
    open, onOpenChange, onSelectUser,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectUser: (user: AvailableUser) => void;
}) {
    const [users, setUsers] = useState<AvailableUser[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const results = await api.getAvailableUsers(search || undefined);
            setUsers(results);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        if (!open) return;
        void loadUsers();
    }, [open, loadUsers]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] overflow-hidden rounded-2xl border-[#0b1d15]/10 bg-white p-0 sm:max-w-md">
                <DialogHeader className="border-b border-[#0b1d15]/8 px-5 pb-4 pt-5">
                    <DialogTitle className="text-base font-semibold text-[#0b1d15]">New Conversation</DialogTitle>
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b1d15]/35" />
                        <Input
                            placeholder="Search by name, email or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-xl border-[#0b1d15]/10 bg-[#f4f1ea] py-2.5 pl-10 pr-3 text-sm shadow-none focus:bg-white"
                            autoFocus
                        />
                    </div>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto p-2">
                    {loading ? (
                        <div className="space-y-1 p-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[#0b1d15]/50">
                            {search ? "No users match your search" : "No active users found"}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => onSelectUser(user)}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-[#0b1d15]/5"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b1d15] text-sm font-semibold text-[#f4f1ea]">
                                        {getInitial(user.full_name, user.email)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-[#0b1d15]">
                                                {user.full_name || user.email}
                                            </span>
                                            {user.has_conversation && (
                                                <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">
                                                    Existing
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-[#0b1d15]/50">
                                            <span className="truncate">{user.email}</span>
                                            {user.city && <span>{user.city}</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Emoji Picker Popover ───

function EmojiPicker({
    onSelect, onClose, align = "right",
}: {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    align?: "left" | "right";
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        }
        // Use capture phase to catch clicks on children
        document.addEventListener("mousedown", handleClick, true);
        return () => document.removeEventListener("mousedown", handleClick, true);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className={`absolute bottom-full mb-2 flex gap-1 rounded-full border border-[#0b1d15]/10 bg-white px-2 py-1.5 shadow-xl z-50 ${align === "left" ? "left-0" : "right-0"}`}
        >
            {QUICK_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    onClick={(e) => { 
                        e.stopPropagation();
                        onSelect(emoji); 
                        onClose(); 
                    }}
                    className="rounded-full p-1 text-base transition-transform hover:scale-125 hover:bg-[#0b1d15]/5"
                    title={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}

// ─── Message Content Renderer ───

function MessageContent({ content, isAdmin }: { content: string; isAdmin: boolean }) {
    // Check if content has markdown syntax
    const hasMarkdown = /[*_`#\[\]|>~-]{2}|^\s*[-*+]\s|^\s*\d+\.\s|^#{1,6}\s/m.test(content);

    if (!hasMarkdown) {
        // Plain text: render directly without Markdown parser
        // Split by newlines to preserve line breaks
        const lines = content.split("\n");
        return (
            <div className="text-sm leading-relaxed">
                {lines.map((line, i) => (
                    <span key={i}>
                        {line}
                        {i < lines.length - 1 && <br />}
                    </span>
                ))}
            </div>
        );
    }

    // Complex content: use Markdown renderer
    return (
        <div className="text-sm leading-relaxed [&_p]:mb-1 [&_p:last-child]:mb-0">
            <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={isAdmin ? "text-blue-300 underline" : "text-blue-600 underline"}
                        >
                            {children}
                        </a>
                    ),
                    code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        if (isBlock) {
                            return (
                                <pre className={`my-2 overflow-x-auto rounded-lg p-3 text-xs ${isAdmin ? "bg-white/10" : "bg-black/5"}`}>
                                    <code>{children}</code>
                                </pre>
                            );
                        }
                        return (
                            <code className={`rounded px-1 py-0.5 text-xs ${isAdmin ? "bg-white/15" : "bg-black/5"}`}>
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children }) => <>{children}</>,
                    ul: ({ children }) => <ul className="my-1 list-disc pl-4 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 list-decimal pl-4 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className={`my-1 border-l-2 pl-3 italic opacity-70 ${isAdmin ? "border-white/30" : "border-black/20"}`}>
                            {children}
                        </blockquote>
                    ),
                    h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mt-1.5 mb-0.5">{children}</h3>,
                    hr: () => <hr className={`my-2 ${isAdmin ? "border-white/20" : "border-black/10"}`} />,
                    table: ({ children }) => (
                        <div className="my-2 overflow-x-auto">
                            <table className="text-xs border-collapse [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1">
                                {children}
                            </table>
                        </div>
                    ),
                }}
            />
        </div>
    );
}

// ─── Conversation List ───

function ConversationList({
    conversations, activeId, search, onSearchChange, onSelect, onNewChat, loading,
}: {
    conversations: ConversationListItem[];
    activeId: string | null;
    search: string;
    onSearchChange: (v: string) => void;
    onSelect: (conv: ConversationListItem) => void;
    onNewChat: () => void;
    loading: boolean;
}) {
    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-[#0b1d15]/8 px-3 pb-2.5 pt-3 sm:px-4 sm:pb-3 sm:pt-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#0b1d15] sm:text-lg">Messages</h2>
                    <Button
                        onClick={onNewChat}
                        size="sm"
                        className="h-8 gap-1.5 rounded-xl bg-[#0b1d15] px-3 text-xs font-semibold text-[#f4f1ea] hover:bg-[#0b1d15]/90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">New Chat</span>
                        <span className="sm:hidden">New</span>
                    </Button>
                </div>
                <div className="relative mt-2 sm:mt-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b1d15]/35" />
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="rounded-xl border-[#0b1d15]/10 bg-[#f4f1ea] py-2 pl-10 pr-3 text-sm shadow-none focus:bg-white sm:py-2.5"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="space-y-1 p-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-18 w-full rounded-xl" />
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 p-8 text-center">
                        <div className="rounded-2xl bg-[#0b1d15]/6 p-3">
                            <MessageSquare className="h-5 w-5 text-[#0b1d15]/50" />
                        </div>
                        <div className="text-sm text-[#0b1d15]/55">
                            {search ? "No conversations match your search" : "No conversations yet"}
                        </div>
                        <Button
                            onClick={onNewChat}
                            variant="outline"
                            size="sm"
                            className="mt-1 gap-1.5 rounded-xl border-[#0b1d15]/15 text-xs"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Start a conversation
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-0.5 p-1.5">
                        {conversations.map((conv) => {
                            const isActive = activeId === conv.id;
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelect(conv)}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all sm:gap-3 sm:px-3 sm:py-3 ${isActive
                                        ? "bg-[#0b1d15] text-[#f4f1ea]"
                                        : "hover:bg-[#0b1d15]/5"
                                        }`}
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isActive
                                        ? "bg-white/15 text-[#f4f1ea]"
                                        : "bg-[#0b1d15] text-[#f4f1ea]"
                                        }`}>
                                        {getInitial(conv.user_name, conv.user_email)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`truncate text-sm font-semibold ${isActive ? "" : "text-[#0b1d15]"}`}>
                                                {conv.user_name || conv.user_email}
                                            </span>
                                            <span className={`shrink-0 text-[11px] ${isActive ? "text-[#f4f1ea]/60" : "text-[#0b1d15]/45"}`}>
                                                {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`truncate text-xs ${isActive ? "text-[#f4f1ea]/70" : "text-[#0b1d15]/50"}`}>
                                                {conv.last_message_preview || "No messages yet"}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-1">
                                                {conv.is_pinned && (
                                                    <Pin className={`h-3 w-3 ${isActive ? "text-[#f4f1ea]/50" : "text-[#0b1d15]/30"}`} />
                                                )}
                                                {conv.unread_count > 0 && (
                                                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d15638] px-1.5 text-[10px] font-bold text-white">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Message Bubble ───

function MessageBubble({
    msg, onReply, onReact,
}: {
    msg: ChatMessage;
    onReply: (msg: ChatMessage) => void;
    onReact: (msgId: string, emoji: string, action: "add" | "remove") => void;
}) {
    const isAdmin = msg.is_admin;
    const [showEmoji, setShowEmoji] = useState(false);

    const typeConfig: Record<string, { bg: string; border: string; icon: typeof MessageSquare; label: string }> = {
        product_update: { bg: "bg-emerald-50", border: "border-emerald-200", icon: Tag, label: "Product Update" },
        discount_update: { bg: "bg-amber-50", border: "border-amber-200", icon: Percent, label: "Discount" },
    };

    const special = typeConfig[msg.message_type];
    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

    const actionButtons = (
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <div className="relative">
                <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="rounded-full bg-white/90 p-1.5 shadow-sm border border-[#0b1d15]/8 text-[#0b1d15]/50 hover:text-[#0b1d15] hover:bg-white transition-colors"
                    title="React"
                >
                    <Smile className="h-3.5 w-3.5" />
                </button>
                {showEmoji && (
                    <EmojiPicker
                        align={isAdmin ? "right" : "left"}
                        onSelect={(emoji) => {
                            onReact(msg.id, emoji, "add");
                            setShowEmoji(false);
                        }}
                        onClose={() => setShowEmoji(false)}
                    />
                )}
            </div>
            <button
                onClick={() => onReply(msg)}
                className="rounded-full bg-white/90 p-1.5 shadow-sm border border-[#0b1d15]/8 text-[#0b1d15]/50 hover:text-[#0b1d15] hover:bg-white transition-colors"
                title="Reply"
            >
                <Reply className="h-3.5 w-3.5 scale-x-[-1]" />
            </button>
        </div>
    );

    return (
        <div className={`group flex ${isAdmin ? "justify-end" : "justify-start"} gap-1`}>
            <div className={`flex max-w-[80%] flex-col ${isAdmin ? "items-end" : "items-start"} sm:max-w-[70%]`}>
                {/* Special type label */}
                {special && (
                    <div className={`mb-1 flex items-center gap-1.5 ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <special.icon className="h-3 w-3 text-[#0b1d15]/50" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0b1d15]/50">{special.label}</span>
                    </div>
                )}

                {/* Reply preview */}
                {msg.reply_to && (
                    <div className={`mb-1 flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`flex items-start gap-1.5 rounded-xl px-3 py-1.5 text-[11px] ${isAdmin
                            ? "bg-[#1a3a2a] text-[#f4f1ea]/80 border border-white/10"
                            : "bg-[#0b1d15]/5 text-[#0b1d15]/60"
                            }`}>
                            <Reply className="mt-0.5 h-3 w-3 shrink-0 scale-x-[-1]" />
                            <div className="min-w-0">
                                <span className="font-semibold">{msg.reply_to.is_admin ? "You" : "Customer"}</span>
                                <p className="mt-0.5 max-h-14 overflow-y-auto wrap-break-word whitespace-normal leading-snug pr-1">
                                    {msg.reply_to.content}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message bubble */}
                <div className={`relative w-fit max-w-full ${hasReactions ? "mb-4" : ""}`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${special
                        ? `${isAdmin ? "rounded-br-md" : "rounded-bl-md"} ${special.bg} border ${special.border} text-[#0b1d15]`
                        : isAdmin
                            ? "rounded-br-md bg-[#0b1d15] text-[#f4f1ea]"
                            : "rounded-bl-md bg-white text-[#0b1d15] shadow-sm border border-[#0b1d15]/8"
                        }`}>
                        <MessageContent content={msg.content} isAdmin={special ? false : isAdmin} />
                    </div>

                    {/* Reactions display - overlapping bottom of bubble */}
                    {hasReactions && (
                        <div className={`absolute z-10 flex flex-wrap gap-1 ${isAdmin ? "-bottom-2.5 right-2" : "-bottom-2.5 left-2"}`}>
                            {Object.entries(msg.reactions).map(([emoji, count]) => (
                                <button
                                    key={emoji}
                                    onClick={() => onReact(msg.id, emoji, "remove")}
                                    className="flex items-center gap-1 rounded-full border border-[#0b1d15]/10 bg-white px-2 py-0.5 text-xs shadow-sm transition-colors hover:bg-[#0b1d15]/5"
                                    title={`Remove ${emoji}`}
                                >
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="text-[10px] text-[#0b1d15]/50">{count}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timestamp + read status */}
                <div className={`flex items-center gap-1.5 ${hasReactions ? "mt-2" : "mt-1"} ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-[#0b1d15]/40">{formatMessageTime(msg.created_at)}</span>
                    {isAdmin && (
                        msg.is_read
                            ? <CheckCheck className="h-3 w-3 text-blue-500" />
                            : <Check className="h-3 w-3 text-[#0b1d15]/30" />
                    )}
                </div>
            </div>

            {actionButtons}
        </div>
    );
}

// ─── Chat Area ───

function ChatArea({
    conversation, messages, loading, replyTo, onSetReplyTo, onSendMessage, onReact, onBack, onPin,
}: {
    conversation: ConversationListItem;
    messages: ChatMessage[];
    loading: boolean;
    replyTo: ChatMessage | null;
    onSetReplyTo: (msg: ChatMessage | null) => void;
    onSendMessage: (content: string, type: string, sendEmail: boolean, replyToId?: string) => Promise<void>;
    onReact: (msgId: string, emoji: string, action: "add" | "remove") => void;
    onBack: () => void;
    onPin: () => void;
}) {
    const [input, setInput] = useState("");
    const [messageType, setMessageType] = useState("text");
    const [sendEmailCopy, setSendEmailCopy] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [conversation.id]);

    async function handleSend() {
        if (!input.trim() || sending) return;
        setSending(true);
        const content = input.trim();
        const rId = replyTo?.id;
        setInput("");
        onSetReplyTo(null);
        try {
            await onSendMessage(content, messageType, sendEmailCopy, rId);
        } catch {
            setInput(content); // Restore on error
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }

    // Auto-resize textarea
    function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setInput(e.target.value);
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }

    // Group messages by date
    const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
    let lastDate = "";
    for (const msg of messages) {
        const date = formatDateDDMMYYYY(msg.created_at);
        if (date !== lastDate) {
            groupedMessages.push({ date, messages: [] });
            lastDate = date;
        }
        groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }

    return (
        <div className="flex h-full flex-col">
            {/* Chat header */}
            <div className="flex items-center gap-2 border-b border-[#0b1d15]/8 px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
                <button onClick={onBack} className="rounded-xl p-1.5 hover:bg-[#0b1d15]/5 sm:p-2 md:hidden">
                    <ArrowLeft className="h-5 w-5 text-[#0b1d15]" />
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b1d15] text-xs font-semibold text-[#f4f1ea] sm:h-10 sm:w-10 sm:text-sm">
                    {getInitial(conversation.user_name, conversation.user_email)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#0b1d15]">{conversation.user_name || "Unknown"}</div>
                    <div className="flex items-center gap-2 text-[11px] text-[#0b1d15]/50 sm:gap-3 sm:text-xs">
                        <span className="flex items-center gap-1 truncate">
                            <MailIcon className="hidden h-3 w-3 sm:block" />
                            <span className="truncate">{conversation.user_email}</span>
                        </span>
                        {conversation.user_phone && (
                            <span className="hidden items-center gap-1 sm:flex">
                                <Phone className="h-3 w-3" />
                                {conversation.user_phone}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onPin}
                    className="shrink-0 rounded-xl p-1.5 hover:bg-[#0b1d15]/5 sm:p-2"
                    title={conversation.is_pinned ? "Unpin" : "Pin"}
                >
                    {conversation.is_pinned
                        ? <PinOff className="h-4 w-4 text-[#0b1d15]/60" />
                        : <Pin className="h-4 w-4 text-[#0b1d15]/60" />
                    }
                </button>
            </div>

            {/* Messages */}
            <div className="chat-bg flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4 sm:py-4">
                {loading ? (
                    <div className="space-y-4 p-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                                <Skeleton className="h-12 w-48 rounded-2xl" />
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                        <div className="rounded-2xl bg-[#0b1d15]/6 p-4">
                            <MessageSquare className="h-6 w-6 text-[#0b1d15]/40" />
                        </div>
                        <div className="text-sm font-medium text-[#0b1d15]/60">No messages yet</div>
                        <div className="text-xs text-[#0b1d15]/40">Send the first message to start the conversation</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {groupedMessages.map((group) => (
                            <div key={group.date}>
                                <div className="mb-3 flex justify-center">
                                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-[#0b1d15]/50 shadow-sm">
                                        {group.date}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {group.messages.map((msg) => (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={msg}
                                            onReply={onSetReplyTo}
                                            onReact={onReact}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="border-t border-[#0b1d15]/8 bg-white/80 p-2 sm:p-3">
                {/* Reply preview */}
                {replyTo && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#0b1d15]/5 px-3 py-2">
                        <Reply className="h-4 w-4 shrink-0 text-[#0b1d15]/50 scale-x-[-1]" />
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-[#0b1d15]/60">
                                Replying to {replyTo.is_admin ? "yourself" : "customer"}
                            </span>
                            <p className="mt-0.5 max-h-16 overflow-y-auto wrap-break-word whitespace-normal pr-1 text-xs leading-snug text-[#0b1d15]/50">
                                {replyTo.content}
                            </p>
                        </div>
                        <button onClick={() => onSetReplyTo(null)} className="rounded-full p-1 hover:bg-[#0b1d15]/10">
                            <X className="h-3.5 w-3.5 text-[#0b1d15]/50" />
                        </button>
                    </div>
                )}

                {/* Message type selector */}
                <div className="mb-2 flex items-center gap-1.5 sm:gap-2">
                    <div className="flex gap-0.5 rounded-xl border border-[#0b1d15]/8 bg-[#f4f1ea] p-0.5 sm:gap-1">
                        {MESSAGE_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isActive = messageType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setMessageType(type.value)}
                                    className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-all sm:gap-1.5 sm:px-2.5 sm:text-[11px] ${isActive
                                        ? "bg-[#0b1d15] text-[#f4f1ea] shadow-sm"
                                        : "text-[#0b1d15]/55 hover:text-[#0b1d15]"
                                        }`}
                                    title={type.label}
                                >
                                    <Icon className="h-3 w-3" />
                                    <span className="hidden sm:inline">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setSendEmailCopy(!sendEmailCopy)}
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all sm:gap-1.5 sm:px-2.5 sm:text-[11px] ${sendEmailCopy
                            ? "border-[#d15638]/30 bg-[#d15638]/10 text-[#d15638]"
                            : "border-[#0b1d15]/10 text-[#0b1d15]/40 hover:border-[#0b1d15]/20 hover:text-[#0b1d15]/60"
                            }`}
                        title="Also send as email"
                    >
                        <Mail className="h-3 w-3" />
                        <span className="hidden sm:inline">Email</span>
                    </button>
                </div>

                {/* Text input + send */}
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        placeholder={messageType === "product_update" ? "Describe the product update..." : messageType === "discount_update" ? "Share the discount details..." : "Type a message..."}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        rows={1}
                        className="flex-1 resize-none rounded-xl border border-[#0b1d15]/12 bg-[#f4f1ea] px-3 py-2.5 text-sm shadow-none outline-none transition-colors focus:bg-white focus:border-[#0b1d15]/25 sm:px-4 sm:py-3"
                        style={{ maxHeight: 120 }}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="h-10 w-10 shrink-0 rounded-xl bg-[#0b1d15] p-0 text-[#f4f1ea] hover:bg-[#0b1d15]/90 disabled:opacity-40 sm:h-11 sm:w-11"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Empty State ───

function EmptyChatState({ onNewChat }: { onNewChat: () => void }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="rounded-3xl bg-[#0b1d15]/5 p-6">
                <MessageSquare className="h-10 w-10 text-[#0b1d15]/30" />
            </div>
            <div>
                <div className="text-lg font-semibold text-[#0b1d15]">Select a conversation</div>
                <div className="mt-1 text-sm text-[#0b1d15]/50">Choose a customer or start a new conversation</div>
            </div>
            <Button
                onClick={onNewChat}
                className="mt-2 gap-2 rounded-xl bg-[#0b1d15] px-5 text-[#f4f1ea] hover:bg-[#0b1d15]/90"
            >
                <Plus className="h-4 w-4" />
                New Conversation
            </Button>
        </div>
    );
}

// ─── Main Chat Page ───

export default function ChatPage() {
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeConversation, setActiveConversation] = useState<ConversationListItem | null>(null);
    const [search, setSearch] = useState("");
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const activeConvRef = useRef<ConversationListItem | null>(null);

    // Keep activeConvRef in sync with activeConversation
    useEffect(() => {
        activeConvRef.current = activeConversation;
    }, [activeConversation]);

    // ─── Load conversations ───
    const loadConversations = useCallback(async () => {
        try {
            const data = await api.getChatConversations(search || undefined);
            setConversations(data);
        } catch (error) {
            console.error("Failed to load conversations:", error);
        } finally {
            setLoadingConvs(false);
        }
    }, [search]);

    useEffect(() => {
        setLoadingConvs(true);
        loadConversations();
    }, [loadConversations]);

    // ─── Polling fallback for real-time ───
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeConvRef.current) {
                api.getChatMessages(activeConvRef.current.id).then((msgs) => {
                    setMessages((prev) => {
                        if (msgs.length !== prev.length) return msgs;

                        for (let i = 0; i < msgs.length; i++) {
                            const nextMsg = msgs[i];
                            const prevMsg = prev[i];

                            // Detect new ordering/content
                            if (!prevMsg || nextMsg.id !== prevMsg.id || nextMsg.content !== prevMsg.content) {
                                return msgs;
                            }

                            // Detect read-receipt changes (double tick)
                            if (nextMsg.is_read !== prevMsg.is_read) {
                                return msgs;
                            }

                            // Detect reaction changes even when message count is same
                            const nextReactions = JSON.stringify(nextMsg.reactions || {});
                            const prevReactions = JSON.stringify(prevMsg.reactions || {});
                            if (nextReactions !== prevReactions) {
                                return msgs;
                            }
                        }

                        return prev;
                    });
                }).catch(() => {});
            }
            loadConversations();
        }, 3000);
        return () => clearInterval(interval);
    }, [loadConversations]);

    // ─── WebSocket connection ───
    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function connectWebSocket() {
        try {
            const wsUrl = api.getChatWebSocketUrl();
            console.log("[Chat WS] Connecting to:", wsUrl);
            const ws = new WebSocket(wsUrl);
            setupWebSocket(ws);
        } catch (error) {
            console.log("[Chat WS] Failed to connect:", error);
            reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
        }
    }

    function setupWebSocket(ws: WebSocket) {
        ws.onopen = () => {
            console.log("[Chat WS] Connected");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("[Chat WS] Received:", data.type, data);

            if (data.type === "message") {
                // Check if message is for current active conversation using ref
                if (data.conversation_id === activeConvRef.current?.id) {
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some((m) => m.id === data.id)) {
                            return prev;
                        }
                        return [...prev, data as ChatMessage];
                    });
                }
                // Always update conversations list on new message
                loadConversations();
            } else if (data.type === "conversations_updated") {
                loadConversations();
            } else if (data.type === "reaction_updated") {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === data.message_id
                            ? { ...m, reactions: data.reactions }
                            : m
                    )
                );
            } else if (data.type === "read_updated") {
                // When customer reads the chat, update admin ticks in real time
                if (data.reader === "user" && data.conversation_id === activeConvRef.current?.id) {
                    setMessages((prev) =>
                        prev.map((m) => (m.is_admin ? { ...m, is_read: true } : m))
                    );
                }

                // Keep conversation list counters/status fresh for any read update
                loadConversations();
            }
        };

        ws.onclose = () => {
            console.log("[Chat WS] Disconnected, reconnecting in 3s...");
            reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
            console.log("[Chat WS] Error:", error);
        };

        wsRef.current = ws;
    }

    // ─── Select conversation ───
    async function selectConversation(conv: ConversationListItem) {
        setActiveConversation(conv);
        setShowMobileChat(true);
        setLoadingMsgs(true);
        setReplyTo(null);

        try {
            const msgs = await api.getChatMessages(conv.id);
            setMessages(msgs);

            if (conv.unread_count > 0) {
                await api.markConversationRead(conv.id);
                loadConversations();
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
        } finally {
            setLoadingMsgs(false);
        }
    }

    // ─── Start new conversation from user picker ───
    async function handleStartChat(user: AvailableUser) {
        setShowNewChat(false);
        try {
            const conv = await api.startConversation(user.id);
            await loadConversations();
            selectConversation(conv);
        } catch (error) {
            console.error("Failed to start conversation:", error);
        }
    }

    // ─── Send message ───
    async function handleSendMessage(content: string, messageType: string, sendEmailCopy: boolean, replyToId?: string) {
        if (!activeConversation) {
            console.error("No active conversation selected");
            return;
        }

        try {
            // Always use REST API to send for reliable immediate display
            const msg = await api.sendChatToUser(
                activeConversation.user_id,
                content,
                messageType,
                sendEmailCopy,
                undefined,
                replyToId
            );
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            loadConversations();
        } catch (error) {
            console.error("[Chat] Failed to send message:", error);
            throw error;
        }
    }

    // ─── React to a message ───
    async function handleReact(messageId: string, emoji: string, action: "add" | "remove") {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "reaction",
                message_id: messageId,
                emoji,
                action,
            }));
        } else {
            try {
                const updated = action === "add"
                    ? await api.addReaction(messageId, emoji)
                    : await api.removeReaction(messageId, emoji);
                setMessages((prev) =>
                    prev.map((m) => m.id === messageId ? { ...m, reactions: updated.reactions } : m)
                );
            } catch (error) {
                console.error("Failed to react:", error);
            }
        }
    }

    // ─── Toggle pin ───
    async function handlePin() {
        if (!activeConversation) return;
        try {
            const result = await api.toggleConversationPin(activeConversation.id);
            setActiveConversation({ ...activeConversation, is_pinned: result.is_pinned });
            loadConversations();
        } catch (error) {
            console.error("Failed to toggle pin:", error);
        }
    }

    return (
        <>
            <div className="overflow-hidden rounded-2xl border border-[#0b1d15]/10 bg-white/90 shadow-[0_24px_80px_rgba(11,29,21,0.08)] sm:rounded-[1.6rem]" style={{ height: "calc(100vh - 10rem)", maxHeight: "calc(100dvh - 10rem)" }}>
                <div className="flex h-full">
                    {/* Conversation list */}
                    <div className={`h-full w-full border-r border-[#0b1d15]/8 md:block md:w-80 lg:w-96 ${showMobileChat ? "hidden" : "block"}`}>
                        <ConversationList
                            conversations={conversations}
                            activeId={activeConversation?.id ?? null}
                            search={search}
                            onSearchChange={setSearch}
                            onSelect={selectConversation}
                            onNewChat={() => setShowNewChat(true)}
                            loading={loadingConvs}
                        />
                    </div>

                    {/* Chat area */}
                    <div className={`h-full flex-1 ${showMobileChat ? "block" : "hidden md:block"}`}>
                        {activeConversation ? (
                            <ChatArea
                                conversation={activeConversation}
                                messages={messages}
                                loading={loadingMsgs}
                                replyTo={replyTo}
                                onSetReplyTo={setReplyTo}
                                onSendMessage={handleSendMessage}
                                onReact={handleReact}
                                onBack={() => setShowMobileChat(false)}
                                onPin={handlePin}
                            />
                        ) : (
                            <EmptyChatState onNewChat={() => setShowNewChat(true)} />
                        )}
                    </div>
                </div>
            </div>

            <NewChatDialog
                open={showNewChat}
                onOpenChange={setShowNewChat}
                onSelectUser={handleStartChat}
            />
        </>
    );
}
