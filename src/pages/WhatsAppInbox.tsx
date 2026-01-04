import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Send, 
  MessageSquare, 
  Phone,
  Search,
  RefreshCw
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  remote_jid: string;
  message_id: string;
  from_me: boolean;
  message_type: string;
  content: string;
  timestamp: string;
  status: string;
}

interface Conversation {
  remote_jid: string;
  contact_name: string | null;
  last_message: string;
  last_message_at: string;
  last_message_from_me: boolean;
  unread_count?: number;
}

export default function WhatsAppInbox() {
  const navigate = useNavigate();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  const loadConversations = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      // Group by remote_jid and get latest message
      const conversationMap = new Map<string, Conversation>();
      
      data?.forEach((msg: Message) => {
        if (!conversationMap.has(msg.remote_jid)) {
          conversationMap.set(msg.remote_jid, {
            remote_jid: msg.remote_jid,
            contact_name: null,
            last_message: msg.content || "",
            last_message_at: msg.timestamp,
            last_message_from_me: msg.from_me,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (remoteJid: string) => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("remote_jid", remoteJid)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Erro ao carregar mensagens");
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentTenant?.id) return;

    setSending(true);
    try {
      // Extract phone from remote_jid
      const phone = selectedConversation.replace("@s.whatsapp.net", "");

      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          tenant_id: currentTenant.id,
          phone: phone,
          message: newMessage,
        },
      });

      if (error) throw error;

      // Add message to local state immediately
      const newMsg: Message = {
        id: crypto.randomUUID(),
        remote_jid: selectedConversation,
        message_id: data.message_id,
        from_me: true,
        message_type: "text",
        content: newMessage,
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      
      // Update conversation list
      loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel("whatsapp-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          const newMsg = payload.new as Message;
          
          // Update messages if viewing this conversation
          if (newMsg.remote_jid === selectedConversation) {
            setMessages((prev) => {
              // Check if message already exists
              if (prev.some((m) => m.message_id === newMsg.message_id)) {
                return prev;
              }
              return [...prev, newMsg];
            });
          }
          
          // Reload conversations to update list
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, selectedConversation]);

  // Initial load
  useEffect(() => {
    if (currentTenant?.id) {
      loadConversations();
    }
  }, [currentTenant?.id]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Format phone number for display
  const formatPhoneDisplay = (remoteJid: string) => {
    const phone = remoteJid.replace("@s.whatsapp.net", "");
    if (phone.length === 13 && phone.startsWith("55")) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Ontem";
    }
    return format(date, "dd/MM/yyyy");
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter((conv) => {
    const phone = formatPhoneDisplay(conv.remote_jid);
    const name = conv.contact_name || "";
    const search = searchTerm.toLowerCase();
    return phone.includes(search) || name.toLowerCase().includes(search);
  });

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-96 border-r flex flex-col ${selectedConversation ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/app/whatsapp")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Mensagens</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={loadConversations}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <div>
              {filteredConversations.map((conv) => (
                <div
                  key={conv.remote_jid}
                  onClick={() => setSelectedConversation(conv.remote_jid)}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedConversation === conv.remote_jid ? "bg-accent" : ""
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Phone className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conv.contact_name || formatPhoneDisplay(conv.remote_jid)}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message_from_me && "Você: "}
                      {conv.last_message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-card flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {formatPhoneDisplay(selectedConversation)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, index) => {
                  const showDate = index === 0 || 
                    format(new Date(msg.timestamp), "yyyy-MM-dd") !== 
                    format(new Date(messages[index - 1].timestamp), "yyyy-MM-dd");

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {isToday(new Date(msg.timestamp)) 
                              ? "Hoje" 
                              : isYesterday(new Date(msg.timestamp))
                                ? "Ontem"
                                : format(new Date(msg.timestamp), "d 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}>
                        <Card className={`max-w-[75%] px-4 py-2 ${
                          msg.from_me 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {format(new Date(msg.timestamp), "HH:mm")}
                          </p>
                        </Card>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={sending}
                />
                <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <p className="text-lg">Selecione uma conversa</p>
            <p className="text-sm">para visualizar as mensagens</p>
          </div>
        )}
      </div>
    </div>
  );
}
