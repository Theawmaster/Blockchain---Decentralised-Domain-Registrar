"use client";

import { useState } from "react";
import { useNotifications } from "@/app/context/NotificationContext";
import { Bell, X } from "lucide-react";

export default function NotificationBell() {
  const { notifications, remove } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded hover:bg-[var(--foreground)]/10 transition"
      >
        <Bell className="w-6 h-6" />

        {notifications.length > 0 && (
          <span
            className="
              absolute -top-1 -right-1 
              bg-red-500 text-white text-xs
              px-1.5 py-0.5 rounded-full
            "
          >
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-72 z-50
            bg-[var(--card-bg)] border border-[var(--border)]
            rounded-lg shadow-lg overflow-hidden
          "
        >
          {notifications.length === 0 ? (
            <p className="p-4 text-sm opacity-60 text-center">
              No Notifications 🔕
            </p>
          ) : (
            notifications.map((n, index) => (
              <div
                key={index}
                className="
                  px-4 py-3 border-b border-[var(--border)]
                  flex justify-between gap-3 items-start
                "
              >
                <p className="text-sm leading-snug">{n.message}</p>
                <button
                  onClick={() => remove(index)}
                  className="opacity-60 hover:opacity-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
