import React, { useState, useEffect, useRef } from 'react';
import { getErrorMessage, messaging, files as fileApi } from '@/lib/api';

import { ChatMessage } from './ChatMessage';
import { MentionInput } from './MentionInput';
import { Button } from '@/components/ui/button';
import { Send, Smile, Paperclip, Loader2, MessageSquare, X, FileIcon, FileText, Image as ImageIcon, FileSpreadsheet, Presentation } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  contextType: 'task' | 'log' | 'direct';
  contextId?: string;
  receiverId?: string;
  currentUserId: string;
  title?: string;
  className?: string;
  hideHeader?: boolean;
  onClose?: () => void;
  onMessageSent?: () => void;
}

export function ChatWindow({ 
  contextType, 
  contextId, 
  receiverId, 
  currentUserId, 
  title,
  className,
  hideHeader = false,
  onClose,
  onMessageSent
}: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const fetchMessages = async () => {
    try {
      const res = await messaging.getMessages(contextType, contextId, receiverId);
      if (res.success) {
        setMessages(res.data);
        
        // Mark as read if there are messages
        if (res.data.length > 0) {
          messaging.markMessagesAsRead({ 
            contextType, 
            contextId, 
            senderId: receiverId 
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds (for real-time feel without websockets)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [contextType, contextId, receiverId]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await messaging.sendMessage({
        message: newMessage,
        contextType,
        contextId,
        receiverIds: receiverId ? [receiverId] : [],
        mentions: mentions,
        attachments: attachments,
      });

      if (res.success) {
        setNewMessage('');
        setMentions([]);
        setAttachments([]);
        fetchMessages();
        if (onMessageSent) onMessageSent();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSending(true);
    try {
      const uploadPromises = Array.from(files).map(file => fileApi.upload(file));
      const results = await Promise.all(uploadPromises);
      
      const newAttachments = results
        .filter(res => res.success)
        .map(res => ({
          name: res.data.name,
          url: res.data.url, 
          type: res.data.type?.startsWith('image/') ? 'image' : 
                res.data.name?.endsWith('.pdf') ? 'document' :
                res.data.name?.endsWith('.xlsx') ? 'spreadsheet' : 'document'
        }));

      setAttachments(prev => [...prev, ...newAttachments]);
      toast.success("Files uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(getErrorMessage(error, "Failed to upload files"));
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/30 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm", className)}>
      {title && !hideHeader && (
        <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl">
                <MessageSquare className="h-4 w-4 text-primary" />
             </div>
             <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{title}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Internal Collaboration Channel</p>
             </div>
          </div>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-9 w-9 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
            >
              <X className="h-4.5 w-4.5 text-zinc-500" />
            </Button>
          )}
        </header>
      )}

      <ScrollArea ref={scrollRef} className="flex-1 p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            <span className="text-xs font-bold text-zinc-400 mt-2 uppercase tracking-widest">Encrypting connection...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full mb-4">
               <MessageSquare className="h-8 w-8 text-zinc-300" />
            </div>
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-tighter">No messages yet.</p>
            <p className="text-[10px] text-zinc-500 uppercase mt-1">Be the first to start the conversation.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg._id} 
                message={msg} 
                isOwn={msg.senderId?._id === currentUserId || msg.senderId === currentUserId} 
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
             {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 group">
                   {att.type === 'image' ? <ImageIcon className="h-3 w-3 text-primary" /> : <FileText className="h-3 w-3 text-zinc-400" />}
                   <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 max-w-[100px] truncate">{att.name}</span>
                   <button onClick={() => removeAttachment(i)} className="text-zinc-400 hover:text-destructive transition-colors">
                      <X className="h-3 w-3" />
                   </button>
                </div>
             ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 focus-within:border-primary/30 transition-all">
          <MentionInput
            value={newMessage}
            onChange={setNewMessage}
            onMentionsChange={setMentions}
            placeholder="Type your message... use @ to mention"
            className="border-none bg-transparent shadow-none focus-visible:ring-0 min-h-[44px] py-2"
          />
          <div className="flex items-center gap-1 mb-1 pr-1">
             <Popover>
                <PopoverTrigger asChild>
                   <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-primary">
                      <Smile className="h-4 w-4" />
                   </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 h-96 p-0 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl overflow-hidden">
                   <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Emoji</p>
                   </div>
                   <ScrollArea className="h-[310px] p-4">
                      <div className="grid grid-cols-8 gap-1">
                         {emojis.map((emoji, i) => (
                            <button 
                              key={i} 
                              onClick={() => addEmoji(emoji)}
                              className="h-8 w-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-lg transition-colors"
                            >
                               {emoji}
                            </button>
                         ))}
                      </div>
                   </ScrollArea>
                </PopoverContent>
             </Popover>

             <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
             />
             <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-zinc-400 hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
             >
                <Paperclip className="h-4 w-4" />
             </Button>
             <Button 
               size="icon" 
               className="h-8 w-8 rounded-xl shadow-lg shadow-primary/20"
               onClick={handleSend}
               disabled={isSending || (!newMessage.trim() && attachments.length === 0)}
             >
               {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
