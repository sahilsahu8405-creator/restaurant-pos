import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  UtensilsCrossed,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { KitchenNotification } from '../../types';
import { localRepository } from '../../services/localRepository';
import { useApp } from '../../context/AppContext';
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  playFoodReadyChime,
  requestBrowserNotificationPermission,
} from '../../utils/notificationSound';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (orderId: string, tableNumber?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const { activeOutlet, addToast, setCurrentView } = useApp();
  const [notifications, setNotifications] = useState<KitchenNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'served'>('ready');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(isNotificationSoundEnabled());
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  const loadNotifications = async () => {
    try {
      const list = await localRepository.getKitchenNotifications(activeOutlet?.id);
      setNotifications(list);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, activeOutlet?.id]);

  useEffect(() => {
    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('restohub:food-ready-notification', handleUpdate);
    window.addEventListener('restohub:kitchen-notification-change', handleUpdate);
    window.addEventListener('restohub:operational-change', handleUpdate);

    return () => {
      window.removeEventListener('restohub:food-ready-notification', handleUpdate);
      window.removeEventListener('restohub:kitchen-notification-change', handleUpdate);
      window.removeEventListener('restohub:operational-change', handleUpdate);
    };
  }, [activeOutlet?.id]);

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playFoodReadyChime();
      addToast('Notification sound enabled', 'info');
    } else {
      addToast('Notification sound muted', 'info');
    }
  };

  const handleTestSound = () => {
    playFoodReadyChime();
    addToast('Playing test chime', 'info');
  };

  const handleRequestBrowserPerm = async () => {
    const granted = await requestBrowserNotificationPermission();
    setBrowserPermission(granted ? 'granted' : 'denied');
    if (granted) {
      addToast('Browser notifications enabled', 'success');
    } else {
      addToast('Browser notification permission was not granted', 'warning');
    }
  };

  const handleMarkServed = async (id: string) => {
    try {
      await localRepository.markKitchenNotificationServed(id, 'Staff');
      await loadNotifications();
      addToast('Marked as served to guest', 'success');
    } catch {
      addToast('Failed to mark as served', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      for (const n of notifications.filter((x) => !x.read)) {
        await localRepository.markKitchenNotificationRead(n.id);
      }
      await loadNotifications();
      addToast('All notifications marked as read', 'info');
    } catch {
      // Ignore
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'ready') return !n.served;
    if (activeTab === 'served') return n.served;
    return true;
  });

  const unservedCount = notifications.filter((n) => !n.served).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-[#121824] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] mt-12 sm:mt-14 mr-0 sm:mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                Kitchen & Order Alerts
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {unservedCount > 0
                  ? `${unservedCount} order${unservedCount > 1 ? 's' : ''} ready to serve`
                  : 'All kitchen orders up to date'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
                soundEnabled
                  ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
              title={soundEnabled ? 'Sound alerts on (click to mute)' : 'Sound alerts muted (click to unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Chime */}
            <button
              onClick={handleTestSound}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Test audio chime"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Browser Permission Banner */}
        {browserPermission !== 'granted' && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-[11px]">
            <span className="text-blue-700 dark:text-blue-300 font-medium truncate">
              Get desktop alerts when food is ready
            </span>
            <button
              onClick={handleRequestBrowserPerm}
              className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-colors shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 pt-2 bg-white dark:bg-[#121824] shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('ready')}
            className={`pb-2 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'ready'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Ready to Serve ({unservedCount})
            {activeTab === 'ready' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('served')}
            className={`pb-2 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'served'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Served ({notifications.filter((n) => n.served).length})
            {activeTab === 'served' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-3 text-xs font-bold transition-all relative ${
              activeTab === 'all'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All History ({notifications.length})
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <UtensilsCrossed className="w-10 h-10 mb-2 opacity-30" />
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {activeTab === 'ready' ? 'No food waiting to be served!' : 'No notifications found'}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kitchen notifications appear here automatically in real time.
              </p>
            </div>
          ) : (
            filtered.map((notif) => {
              const dateObj = new Date(notif.createdAt);
              const elapsedMins = Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / 60000));
              const timeStr = elapsedMins === 0 ? 'Just now' : `${elapsedMins}m ago`;

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    !notif.served
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-xs'
                      : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                          notif.orderType === 'dine_in'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                        }`}
                      >
                        {notif.tableNumber || notif.orderNumber}
                      </span>
                      {notif.stationName && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {notif.stationName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {notif.message}
                  </p>

                  {/* Items snapshot */}
                  {notif.items && notif.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {notif.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                    <button
                      onClick={() => {
                        onClose();
                        if (onSelectOrder) {
                          onSelectOrder(notif.orderId, notif.tableNumber);
                        } else {
                          setCurrentView('waiter');
                        }
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View in Waiter / Tables</span>
                    </button>

                    {!notif.served && (
                      <button
                        onClick={() => handleMarkServed(notif.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Served</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs shrink-0">
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Mark all as read
            </button>
            <span className="text-[11px] text-slate-400">
              Synced with Supabase & KDS
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
