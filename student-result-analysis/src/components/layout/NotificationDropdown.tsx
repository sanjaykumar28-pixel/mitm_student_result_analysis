import { useState, useEffect } from "react";
import { Bell, Info, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "info" | "alert" | "update";
};

const ADMIN_NOTIFICATIONS: Notification[] = [
  { id: "a1", title: "New Student Added", message: "A new student has been added successfully.", time: "5 minutes ago", type: "success" },
  { id: "a2", title: "Results Uploaded", message: "Student result Excel file was uploaded successfully.", time: "1 hour ago", type: "success" },
  { id: "a3", title: "New Subject Added", message: "A new subject has been added.", time: "3 hours ago", type: "info" },
  { id: "a4", title: "Result Analysis Updated", message: "Student result analysis has been updated.", time: "1 day ago", type: "update" },
  { id: "a5", title: "System Update", message: "Student Result Analysis system is running normally.", time: "2 days ago", type: "info" }
];

const STUDENT_NOTIFICATIONS: Notification[] = [
  { id: "s1", title: "Result Published", message: "Your latest semester results have been published.", time: "2 minutes ago", type: "success" },
  { id: "s2", title: "Result Updated", message: "Your result information has been updated.", time: "1 hour ago", type: "update" },
  { id: "s3", title: "Performance Analysis Available", message: "Your latest performance analysis is now available.", time: "5 hours ago", type: "info" },
  { id: "s4", title: "SGPA Updated", message: "Your semester SGPA information has been updated.", time: "1 day ago", type: "update" },
  { id: "s5", title: "New Announcement", message: "A new academic announcement is available.", time: "2 days ago", type: "alert" }
];

export function NotificationDropdown() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  
  const storageKey = `notifications_read_${user?.role || "guest"}`;
  
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error("Failed to load notifications from local storage", e);
    }
  }, [storageKey]);
  
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(readIds)));
    } catch (e) {
      console.error("Failed to save notifications to local storage", e);
    }
  }, [readIds, storageKey]);

  const notifications = isStudent ? STUDENT_NOTIFICATIONS : ADMIN_NOTIFICATIONS;
  
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };
  
  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const getIcon = (type: Notification["type"]) => {
    switch(type) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "update": return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case "alert": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "info": default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-destructive p-0 px-1 flex items-center justify-center text-[10px] text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
             <div className="p-4 text-center text-sm text-muted-foreground">
               No notifications found.
             </div>
          ) : (
             <div className="flex flex-col">
               {notifications.map((notif) => {
                 const isRead = readIds.has(notif.id);
                 return (
                   <div 
                     key={notif.id}
                     onClick={() => markAsRead(notif.id)}
                     className={`flex gap-3 border-b p-4 transition-colors hover:bg-muted/50 cursor-pointer ${isRead ? 'opacity-70' : 'bg-primary/5'}`}
                   >
                     <div className="mt-0.5 flex-shrink-0">
                       {getIcon(notif.type)}
                     </div>
                     <div className="flex flex-col gap-1">
                       <p className={`text-sm ${isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                         {notif.title}
                       </p>
                       <p className="text-xs text-muted-foreground line-clamp-2">
                         {notif.message}
                       </p>
                       <p className="text-[10px] text-muted-foreground/80 mt-1">
                         {notif.time}
                       </p>
                     </div>
                     {!isRead && (
                       <div className="ml-auto mt-1 flex-shrink-0">
                         <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && unreadCount === 0 && (
          <div className="border-t p-3 text-center text-xs font-medium text-muted-foreground bg-muted/20">
            No new notifications
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
