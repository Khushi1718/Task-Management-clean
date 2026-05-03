import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { ChatWindow } from '@/components/ChatWindow';
import { messaging, auth } from '@/lib/api';
import { Search, MessageSquare, Users, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

export default function MessagingView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const fetchConversations = async () => {
    const res = await messaging.getConversations();
    if (res.success) {
      setRecentChats(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const profile = await auth.getProfile();
      if (profile.success) {
        setCurrentUser(profile.data);
      }
      const convs = await messaging.getConversations();
      if (convs.success) {
        setRecentChats(convs.data);
        
        // Auto-select user if userId is in URL
        if (targetUserId) {
          const existing = convs.data.find((c: any) => c.user._id === targetUserId);
          if (existing) {
            setSelectedUser(existing.user);
          } else {
            // If not in recent, try to search for the user info (fallback)
            const searchRes = await messaging.searchUsers(""); // Or a specific fetch
            const user = searchRes.data?.find((u: any) => u._id === targetUserId);
            if (user) setSelectedUser(user);
          }
        }
      }
      setIsLoading(false);
    };
    init();

    const interval = setInterval(fetchConversations, 10000); // Refresh list every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const search = async () => {
        const res = await messaging.searchUsers(searchQuery);
        if (res.success) {
          setSearchResults(res.data.filter((u: any) => u._id !== currentUser?.id && u._id !== currentUser?._id));
        }
      };
      search();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, currentUser]);

  const handleDeleteConversation = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this entire conversation? This cannot be undone.')) {
      const res = await messaging.deleteConversation(userId);
      if (res.success) {
        toast.success('Conversation hidden');
        if (selectedUser?._id === userId) setSelectedUser(null);
        setRecentChats(prev => prev.filter(chat => chat.user._id !== userId));
        fetchConversations();
      }
    }
  };

  const role = currentUser?.role === 'master_admin' ? 'master_admin' : currentUser?.role === 'admin' ? 'admin' : 'employee';

  return (
    <AppShell role={role} title="Communications" subtitle="Direct 1-to-1 secure messaging.">
      <div className="grid gap-6 lg:grid-cols-12 h-[calc(100vh-250px)] min-h-[600px]">
        
        {/* Left Sidebar: User List */}
        <aside className="lg:col-span-4 flex flex-col bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <header className="p-6 border-b border-zinc-100 dark:border-zinc-800/50">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input 
                  placeholder="Search colleagues..." 
                  className="pl-10 rounded-xl border-zinc-200 focus-visible:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </header>

          <div className="flex-1 overflow-y-auto">
             <div className="p-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-4">
                  {searchQuery.length > 1 ? 'Search Results' : 'Recent Discussions'}
                </p>
                
                <div className="space-y-1">
                   {searchQuery.length > 1 ? (
                     searchResults.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => { 
                          setSelectedUser(user); 
                          setSearchQuery('');
                          setTimeout(fetchConversations, 500); // Quick refresh to clear badge
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        )}
                      >
                         <Avatar className="h-10 w-10 border border-white dark:border-zinc-800 shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100">{user.name}</p>
                            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-tighter">{user.role}</p>
                         </div>
                      </button>
                     ))
                   ) : (
                     recentChats.map((chat) => (
                      <button
                        key={chat._id}
                        onClick={() => {
                          setSelectedUser(chat.user);
                          setTimeout(fetchConversations, 500);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group",
                          selectedUser?._id === chat.user._id 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                         <Avatar className="h-10 w-10 border border-white dark:border-zinc-800 shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.user.email}`} />
                            <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                         <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between">
                               <p className={cn("text-sm font-bold truncate", selectedUser?._id === chat.user._id ? "text-primary" : "text-zinc-900 dark:text-zinc-100")}>
                                  {chat.user.name}
                               </p>
                               <span className="text-[9px] font-bold text-zinc-400 uppercase">
                                  {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: false })}
                               </span>
                            </div>
                            <p className="text-xs truncate opacity-70 mt-0.5">{chat.lastMessage}</p>
                         </div>
                         
                         {chat.unreadCount > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950">
                               {chat.unreadCount}
                            </span>
                         )}

                         <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                               <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                     <MoreVertical className="h-4 w-4" />
                                  </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem 
                                    className="text-destructive font-bold text-xs flex items-center gap-2 cursor-pointer"
                                    onClick={(e) => handleDeleteConversation(e, chat.user._id)}
                                  >
                                     <Trash2 className="h-3.5 w-3.5" /> Delete Chat
                                  </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                         </div>
                      </button>
                     ))
                   )}
                   
                   {(searchQuery.length > 1 ? searchResults : recentChats).length === 0 && (
                      <div className="text-center py-12">
                         <Users className="h-8 w-8 text-zinc-100 mx-auto mb-2" />
                         <p className="text-xs font-bold text-zinc-400 uppercase">No messages found</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </aside>

        {/* Right Content: Chat Window */}
        <main className="lg:col-span-8 flex flex-col h-full">
           {selectedUser ? (
              <ChatWindow 
                contextType="direct" 
                receiverId={selectedUser._id} 
                currentUserId={currentUser?.id || currentUser?._id}
                title={`Chat with ${selectedUser.name}`}
                onClose={() => setSelectedUser(null)}
                onMessageSent={fetchConversations}
              />
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/30 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                 <div className="p-6 bg-white dark:bg-zinc-900 rounded-full shadow-xl mb-6">
                    <MessageSquare className="h-12 w-12 text-primary/20" />
                 </div>
                 <h3 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Your Workspace Messages</h3>
                 <p className="text-sm text-zinc-500 font-medium max-w-xs text-center mt-2">
                    Select a colleague from the left sidebar to start a secure 1-to-1 conversation.
                 </p>
              </div>
           )}
        </main>
      </div>
    </AppShell>
  );
}
