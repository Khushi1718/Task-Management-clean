import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { notifications, auth } from '@/lib/api';
import { Bell, AtSign, MessageSquare, Check, Trash2, ShieldCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/router';

export default function NotificationsView() {
  const [items, setItems] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const profile = await auth.getProfile();
      if (profile.success) {
        setCurrentUser(profile.data);
      }
      
      const res = await notifications.getAll();
      if (res.success) {
        setItems(res.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    await notifications.markAsRead(id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await notifications.markAllAsRead();
    fetchNotifications();
  };

  const role = currentUser?.role === 'admin' ? 'admin' : 'employee';

  return (
    <AppShell role={role} title="Alert Center" subtitle="Track mentions and direct communications.">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between bg-white dark:bg-zinc-950 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                 <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Activity Notifications</h2>
                 <p className="text-xs text-zinc-500 font-medium">{items.filter(i => !i.isRead).length} unread alerts</p>
              </div>
           </div>
           {items.some(i => !i.isRead) && (
              <Button onClick={markAllAsRead} variant="outline" size="sm" className="rounded-xl border-zinc-200 hover:bg-zinc-50 font-bold text-[10px] uppercase">
                 <Check className="mr-1.5 h-3 w-3" /> Mark all as read
              </Button>
           )}
        </header>

        <section className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
           {isLoading ? (
              <div className="py-20 text-center">
                 <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                 <p className="text-[10px] font-bold text-zinc-400 uppercase mt-4">Retrieving alert history...</p>
              </div>
           ) : items.length === 0 ? (
              <div className="py-24 text-center">
                 <div className="h-16 w-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="h-8 w-8 text-zinc-200" />
                 </div>
                 <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">No notifications yet</h3>
                 <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto mt-2">
                    We'll notify you when someone mentions you or sends a direct message.
                 </p>
              </div>
           ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                 {items.map((item) => (
                    <div 
                      key={item._id}
                      className={cn(
                        "group relative flex items-start gap-4 p-8 transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40",
                        !item.isRead && "bg-primary/5 dark:bg-primary/5"
                      )}
                    >
                       <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                          item.type === 'mention' ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
                       )}>
                          {item.type === 'mention' ? <AtSign className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                       </div>
                       
                       <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                             <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                {item.type === 'mention' ? 'Mentioned in a conversation' : 'New private message'}
                             </h4>
                             <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                             </span>
                          </div>
                          
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                             <span className="font-bold text-zinc-800 dark:text-zinc-200">@{item.messageId?.senderId?.name}</span>
                             {' '}{item.messageId?.message}
                          </p>
                          
                          <div className="mt-4 flex items-center gap-3">
                             {!item.isRead && (
                                <Button 
                                  onClick={() => markAsRead(item._id)}
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-[10px] font-bold text-primary hover:text-primary/80 uppercase"
                                >
                                   Mark as read
                                </Button>
                             )}
                             <Button asChild variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase">
                                <Link to={item.type === 'message' || item.messageId?.contextType === 'direct'
                                  ? `/employee/messages` 
                                  : item.messageId?.contextType === 'log'
                                    ? `/employee/logs/${item.messageId.contextId}`
                                    : `/employee/messages`
                                }>
                                   <History className="mr-1.5 h-3 w-3" /> View Context
                                </Link>
                             </Button>
                          </div>
                       </div>

                       {!item.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                       )}
                    </div>
                 ))}
              </div>
           )}
        </section>
      </div>
    </AppShell>
  );
}
