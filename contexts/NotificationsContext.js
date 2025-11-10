import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!currentUser?.uid) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.uid)
      .eq('is_read', false);
    if (!error) {
      setUnreadCount(count);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (!currentUser?.uid) return;

    const channel = supabase
      .channel('notifications_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.uid}` }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.uid]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', currentUser.uid);

      if (error) throw error;
      // The subscription will update the count
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.uid)
        .eq('is_read', false);

      if (error) throw error;
      // The subscription will update the count
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  return (
    <NotificationsContext.Provider value={{ unreadCount, markAsRead, markAllAsRead, refreshCount: fetchUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};
