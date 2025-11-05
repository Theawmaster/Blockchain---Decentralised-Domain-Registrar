"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Notification = {
  message: string;
  type?: "info" | "warning" | "success" | "error";
};

type NotificationContextType = {
  notifications: Notification[];
  add: (message: string, type?: Notification["type"]) => void;
  remove: (index: number) => void;
  clear: () => void; // ✅ New
};

const STORAGE_KEY = "ddr-notifications"; // ✅ LocalStorage key

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ✅ Load stored notifications on page load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  // ✅ Save to storage whenever notifications change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const add = (message: string, type: Notification["type"] = "info") => {
  setNotifications((prev) => {
    const exists = prev.some((n) => n.message === message);
    if (exists) return prev; // skip duplicates
    return [...prev, { message, type }];
  });
};


  const remove = (index: number) => {
  setNotifications((prev) => {
    const updated = prev.filter((_, i) => i !== index);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); // immediate sync
    return updated;
  });
};

  const clear = () => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <NotificationContext.Provider value={{ notifications, add, remove, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider.");
  return ctx;
}
