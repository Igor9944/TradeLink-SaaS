// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.

import React, { useState, useRef, useEffect } from 'react';
import {
  NotificationRecord,
  NotificationPreferencesRecord,
  NotificationPriority,
} from '../../types';
import { Badge } from '../ui/DesignSystem';
import { Icon3D } from '../ui/Icon3D';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

interface NotificationCenterPopoverProps {
  notifications: NotificationRecord[];
  preferences: NotificationPreferencesRecord;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSavePreferences: (updated: Partial<NotificationPreferencesRecord>) => void;
  onNavigateAction?: (url: string) => void;
}

export const NotificationCenterPopover: React.FC<NotificationCenterPopoverProps> = ({
  notifications,
  preferences,
  onMarkRead,
  onMarkAllRead,
  onSavePreferences,
  onNavigateAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Fermeture du popover au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifs = notifications.filter((n) => {
    if (filterTab === 'UNREAD') return !n.isRead;
    if (filterTab === 'CRITICAL') return n.priority === 'CRITICAL';
    return true;
  });

  const getPriorityBadgeVariant = (priority: NotificationPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'danger';
      case 'HIGH':
        return 'orange';
      case 'MEDIUM':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const handleNotificationClick = (notif: NotificationRecord) => {
    if (!notif.isRead) {
      onMarkRead(notif.id);
    }
    if (notif.actionUrl && onNavigateAction) {
      onNavigateAction(notif.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bouton Cloche avec indicateur */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Centre de notifications"
        aria-expanded={isOpen}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-teal-900/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E85D22]"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#E85D22] text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panneau */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0A2540] border border-slate-200 dark:border-teal-800 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-teal-900/60 bg-slate-50/80 dark:bg-[#071d33] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E85D22]/10 text-[#E85D22] dark:bg-[#E85D22]/20">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPrefsModalOpen(true)}
                title="Préférences de notifications"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 text-xs transition-colors"
              >
                ⚙️
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAllNotifications}
                  className="text-[11px] text-[#E85D22] hover:underline font-medium ml-1"
                >
                  Tout lire
                </button>
              )}
            </div>
          </div>

          {/* Onglets Filtres */}
          <div className="flex border-b border-slate-100 dark:border-teal-900/60 bg-slate-50/50 dark:bg-slate-900/20 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                filterTab === 'ALL'
                  ? 'border-[#E85D22] text-[#E85D22] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('UNREAD')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                filterTab === 'UNREAD'
                  ? 'border-[#E85D22] text-[#E85D22] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Non lues ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('CRITICAL')}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                filterTab === 'CRITICAL'
                  ? 'border-red-500 text-red-500 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Critiques (
              {notifications.filter((n) => n.priority === 'CRITICAL').length})
            </button>
          </div>

          {/* Liste des notifications */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-teal-900/40">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                <span className="text-2xl block mb-2">📭</span>
                Aucune notification dans cette vue.
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    notif.isRead
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75'
                      : 'bg-amber-50/20 dark:bg-teal-950/20 hover:bg-amber-50/40 dark:hover:bg-teal-950/40 font-medium'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {typeof notif.icon === 'string' && notif.icon.length > 3 ? (
                      <Icon3D name={notif.icon as any} size="sm" />
                    ) : (
                      <span className="text-lg">🔔</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge variant={getPriorityBadgeVariant(notif.priority)}>
                        {notif.category}
                      </Badge>
                      {notif.priority === 'CRITICAL' && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950 px-1.5 py-0.2 rounded">
                          CRITIQUE
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                      {notif.body}
                    </p>

                    {notif.actionUrl && (
                      <span className="text-[10px] text-[#E85D22] font-semibold mt-1 inline-flex items-center gap-0.5">
                        Voir l'action &rarr;
                      </span>
                    )}
                  </div>

                  {!notif.isRead && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(notif.id);
                      }}
                      title="Marquer comme lu"
                      className="shrink-0 w-2 h-2 rounded-full bg-[#E85D22] mt-2 cursor-pointer hover:scale-125 transition-transform"
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Popover */}
          <div className="p-2.5 border-t border-slate-100 dark:border-teal-900/60 bg-slate-50/80 dark:bg-[#071d33] text-center">
            <button
              type="button"
              onClick={() => {
                if (onNavigateAction) onNavigateAction('/notifications');
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
            >
              Ouvrir le centre de notifications complet &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Modal des préférences de notifications */}
      <NotificationPreferencesModal
        isOpen={isPrefsModalOpen}
        onClose={() => setIsPrefsModalOpen(false)}
        preferences={preferences}
        onSave={onSavePreferences}
      />
    </div>
  );

  function onMarkAllAllNotifications() {
    onMarkAllRead();
  }
};
