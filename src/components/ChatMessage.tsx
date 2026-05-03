import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { FileText, Image as ImageIcon, ExternalLink, FileSpreadsheet, Presentation, Paperclip, File as FileIcon } from 'lucide-react';

interface ChatMessageProps {
  message: any;
  isOwn: boolean;
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const renderMessage = (text: string) => {
    // Basic URL detection
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Mention detection (e.g., @Name)
    const mentionRegex = /(@[a-zA-Z0-9\s]+?)(?=\s|$)/g;

    let parts = [text];

    // Simple replacement logic for demo (in production use a proper parser)
    return text.split(/(\s+)/).map((word, i) => {
      if (word.match(urlRegex)) {
        return (
          <a key={i} href={word} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            {word}
          </a>
        );
      }
      if (word.startsWith('@')) {
        return (
          <span key={i} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold text-[0.95em]">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  return (
    <div className={cn("flex w-full gap-3 mb-6", isOwn ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-9 w-9 shrink-0 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.senderId?.email}`} />
        <AvatarFallback>{message.senderId?.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      
      <div className={cn("flex flex-col max-w-[80%]", isOwn ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">
            {isOwn ? "You" : message.senderId?.name}
          </span>
          <span className="text-[10px] font-medium text-zinc-400">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        <div 
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
            isOwn 
              ? "bg-primary text-white rounded-tr-none" 
              : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none"
          )}
        >
          {message.message && renderMessage(message.message)}
          
          {message.attachments && message.attachments.length > 0 && (
            <div className={cn("flex flex-col gap-2", message.message ? "mt-3" : "")}>
              {message.attachments.map((att: any, i: number) => (
                <a 
                  key={i} 
                  href={att.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]",
                    isOwn 
                      ? "bg-white/10 border-white/20 hover:bg-white/20" 
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform",
                    isOwn ? "bg-white" : "bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
                  )}>
                    {att.type === 'image' ? (
                      <ImageIcon className="h-5 w-5 text-blue-500" />
                    ) : att.type === 'pdf' ? (
                      <FileIcon className="h-5 w-5 text-red-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[12px] font-bold truncate mb-0.5", isOwn ? "text-white" : "text-zinc-700 dark:text-zinc-200")}>
                      {att.name}
                    </p>
                    <p className={cn("text-[10px] uppercase font-black tracking-widest opacity-60", isOwn ? "text-white" : "text-zinc-400")}>
                      {att.type}
                    </p>
                  </div>
                  <ExternalLink className={cn("h-3 w-3", isOwn ? "text-white" : "text-zinc-400")} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
