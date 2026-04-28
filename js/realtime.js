import { supabase } from './supabase-client.js?v=5';
import { store } from './state.js?v=2';
import { toast, esc } from './ui.js?v=2';
import { getNotifications, getUnreadCount, markNotificationRead } from './api.js?v=3';

let notifChannel = null;

/**
 * Initialize realtime notification subscription.
 * Call once per authenticated page after auth resolves.
 */
export async function initNotifications(userId) {
  if (notifChannel) return;

  // Load initial unread count
  const count = await getUnreadCount();
  store.set({ unread: count });

  notifChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const n = payload.new;
        store.set({ unread: store.get().unread + 1 });
        showNotificationToast(n);
      }
    )
    .subscribe();
}

function showNotificationToast(n) {
  const labels = {
    match_request: '🎉 Yeni eşleşme isteği aldın!',
    match_accepted: '✅ Eşleşme isteğin kabul edildi!',
    new_message: '💬 Yeni mesaj var',
    session_proposed: '📅 Bir seans önerildi',
    session_confirmed: '🗓️ Seans onaylandı',
    review_received: '⭐ Yeni değerlendirme aldın',
  };
  toast.info(labels[n.type] || 'Yeni bildirim');
}

export async function subscribeToChat(matchId, onMessage) {
  const channel = supabase
    .channel(`chat:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
  return channel;
}

export function unsubscribe(channel) {
  if (channel) supabase.removeChannel(channel);
}
