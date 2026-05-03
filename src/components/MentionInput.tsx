import React, { useState, useEffect, useRef } from 'react';
import { messaging } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MentionInput({ value, onChange, onMentionsChange, placeholder, className }: MentionInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState(0);

  useEffect(() => {
    if (mentionQuery.length >= 0 && showMentions) {
      const fetchUsers = async () => {
        try {
          const res = await messaging.searchUsers(mentionQuery);
          if (res.success) {
            setUsers(res.data);
          }
        } catch (error) {
          console.error('Error fetching users for mentions:', error);
        }
      };
      fetchUsers();
    }
  }, [mentionQuery, showMentions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart;
    setCursorPos(position);
    onChange(newValue);

    // Check for @ symbol before cursor
    const lastAtPos = newValue.lastIndexOf('@', position - 1);
    if (lastAtPos !== -1) {
      const query = newValue.substring(lastAtPos + 1, position);
      // Only show if no space between @ and cursor
      if (!query.includes(' ')) {
        setMentionQuery(query);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (user: any) => {
    const lastAtPos = value.lastIndexOf('@', cursorPos - 1);
    const beforeAt = value.substring(0, lastAtPos);
    const afterCursor = value.substring(cursorPos);
    
    const mentionText = `@${user.name} `;
    const updatedValue = beforeAt + mentionText + afterCursor;
    
    onChange(updatedValue);
    
    const newMentions = [...selectedMentions, user.id];
    setSelectedMentions(newMentions);
    onMentionsChange?.(newMentions);
    
    setShowMentions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = lastAtPos + mentionText.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn("min-h-[80px] resize-none pr-10 rounded-2xl border-zinc-200 focus-visible:ring-primary/20", className)}
      />
      
      {showMentions && users.length > 0 && (
        <div className="absolute bottom-full mb-2 w-64 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
             <p className="text-[10px] font-bold text-zinc-400 uppercase px-2">Mention User</p>
          </div>
          <Command className="border-none">
            <CommandList className="max-h-[200px]">
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user._id}
                    onSelect={() => insertMention({ id: user._id, name: user.name })}
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <Avatar className="h-6 w-6 border border-zinc-200 dark:border-zinc-800">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.name}</span>
                      <span className="text-[10px] text-zinc-500">{user.role}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
