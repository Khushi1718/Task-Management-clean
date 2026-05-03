import React, { useState, useEffect } from 'react';
import { notifications } from '@/lib/api';
import { Bell, MessageSquare, AtSign, Check, Trash2, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from '@/lib/router';

export function NotificationCenter() {
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await notifications.getAll();
      if (res.success) {
        setItems(res.data);
        setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await notifications.markAsRead(id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notifications.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <Bell className="h-5 w-5 text-zinc-500" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950 animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-2xl" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-7 text-[10px] font-bold text-primary hover:text-primary/80 uppercase"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3">
                 <Bell className="h-5 w-5 text-zinc-300" />
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Everything is up to date.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {items.map((item) => (
                <Link
                  key={item._id}
                  to={item.type === 'message' || item.messageId?.contextType === 'direct'
                    ? `/employee/messages?userId=${item.messageId?.senderId?._id || item.messageId?.senderId}` 
                    : item.messageId?.contextType === 'log'
                      ? `/employee/logs/${item.messageId.contextId}`
                      : `/employee/messages`
                  }
                  onClick={() => markAsRead(item._id)}
                  className={cn(
                    "group relative flex gap-3 p-4 border-b border-zinc-50 dark:border-zinc-800/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                    !item.isRead && "bg-primary/5 dark:bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm",
                    item.type === 'mention' ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
                  )}>
                    {item.type === 'mention' ? <AtSign className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {item.type === 'mention' ? 'New Mention' : 'New Message'}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">@{item.messageId?.senderId?.name}</span>
                      {' '}{item.messageId?.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-[9px] font-medium text-zinc-400">
                         {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                       </span>
                       {!item.isRead && (
                         <button 
                           onClick={(e) => { e.preventDefault(); e.stopPropagation(); markAsRead(item._id); }}
                           className="text-[9px] font-bold text-primary uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                           Mark read
                         </button>
                       )}
                    </div>
                  </div>
                  
                  {!item.isRead && (
                    <div className="absolute top-4 right-4 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
           <Button asChild variant="ghost" className="w-full h-8 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase">
              <Link to="/notifications">View All Notifications <ExternalLink className="ml-1 h-3 w-3" /></Link>
           </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
