"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { apiClient } from "../../lib/api";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
  entityType?: string;
  entityId?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-50 border-red-200",
  HIGH: "bg-orange-50 border-orange-200",
  MEDIUM: "bg-white border-slate-200",
  LOW: "bg-white border-slate-100",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await apiClient<{
      items: NotificationItem[];
      unreadCount: number;
    }>("/notifications");
    if (res.success) {
      setNotifications(res.data.items);
      setUnreadCount(res.data.unreadCount);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await apiClient(`/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 flex items-start gap-4 transition ${
                PRIORITY_STYLES[n.priority] ?? "bg-white border-slate-200"
              } ${!n.isRead ? "shadow-sm" : "opacity-70"}`}
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  n.isRead ? "bg-slate-200" : "bg-sky-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {n.title}
                  </p>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  className="flex-shrink-0 text-xs text-sky-600 hover:text-sky-500 font-medium"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
