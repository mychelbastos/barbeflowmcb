import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Send, 
  MessageSquare, 
  Search,
  RefreshCw,
  Check,
  CheckCheck,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  Download,
  Loader2,
  Settings,
  Wifi,
  WifiOff,
  QrCode,
  XCircle,
  MessageCircle,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const [searchParams] = useSearchParams();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WhatsApp connection state
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    has_instance: boolean;
    state?: string;
    instance_name?: string;
    whatsapp_number?: string;
    connected_at?: string;
  } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const checkConnectionStatus = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("evolution-check-status", {
        body: { tenant_id: currentTenant.id }
      });
      if (error) throw error;
      setConnectionStatus(data);
      if (data?.connected) setQrCode(null);
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setConnectionLoading(false);
    }
  }, [currentTenant?.id]);

  const handleConnect = async () => {
    if (!currentTenant?.id || !currentTenant?.slug) return;
    setConnecting(true);
    setQrCode(null);
    try {
      if (!connectionStatus?.has_instance) {
        await supabase.functions.invoke("evolution-create-instance", {
          body: { tenant_id: currentTenant.id, tenant_slug: currentTenant.slug }
        });
        // Wait for instance to initialize before requesting QR
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Retry logic for QR code generation
      let qrData = null;
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error: qrError } = await supabase.functions.invoke("evolution-get-qrcode", {
          body: { tenant_id: currentTenant.id }
        });
        if (qrError) { lastError = qrError; }
        if (data?.connected) {
          toast.success("WhatsApp já está conectado!");
          await checkConnectionStatus();
          return;
        }
        if (data?.qrcode) {
          qrData = data;
          break;
        }
        // Wait before retrying
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (qrData?.qrcode) {
        setQrCode(qrData.qrcode);
        toast.info("Escaneie o QR Code com seu WhatsApp");
      } else {
        throw lastError || new Error("Não foi possível gerar o QR Code após várias tentativas.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao conectar WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentTenant?.id) return;
    setDisconnecting(true);
    try {
      await supabase.functions.invoke("evolution-disconnect", {
        body: { tenant_id: currentTenant.id }
      });
      toast.success("WhatsApp desconectado");
      setQrCode(null);
      await checkConnectionStatus();
    } catch (error: any) {
      toast.error(error.message || "Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  // Poll for status while QR code is showing (faster polling)
  useEffect(() => {
    if (!qrCode || !currentTenant?.id) return;
    const interval = setInterval(async () => {
      await checkConnectionStatus();
      // If connected, auto-close settings and load conversations
      if (connectionStatus?.connected) {
        setSettingsOpen(false);
        loadConversations();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrCode, currentTenant?.id, checkConnectionStatus, connectionStatus?.connected]);

  useEffect(() => {
    if (currentTenant?.id) checkConnectionStatus();
  }, [currentTenant?.id, checkConnectionStatus]);

  // Auto-open settings sheet when WhatsApp is not connected
  useEffect(() => {
    if (!connectionLoading && connectionStatus && !connectionStatus.connected) {
      setSettingsOpen(true);
    }
  }, [connectionLoading, connectionStatus]);

  const syncMessages = async (remoteJid?: string) => {
    if (!currentTenant?.id) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-sync-messages", {
        body: {
          tenant_id: currentTenant.id,
          remote_jid: remoteJid,
          limit: 100,
        },
      });

      if (error) throw error;

      toast.success(`Sincronizado! ${data.synced_count} mensagens importadas`);
      
      // Reload conversations and messages
      await loadConversations();
      if (selectedConversation) {
        await loadMessages(selectedConversation);
      }
    } catch (error) {
      console.error("Error syncing messages:", error);
      toast.error("Erro ao sincronizar mensagens");
    } finally {
      setSyncing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    if (!currentTenant?.id) return;

    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .order("timestamp", { ascending: false });

      if (error) throw error;

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
      setRefreshing(false);
    }
  };

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentTenant?.id) return;

    setSending(true);
    try {
      const phone = selectedConversation.replace("@s.whatsapp.net", "");

      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          tenant_id: currentTenant.id,
          phone: phone,
          message: newMessage,
        },
      });

      if (error) throw error;

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
      loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

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
          
          if (newMsg.remote_jid === selectedConversation) {
            setMessages((prev) => {
              if (prev.some((m) => m.message_id === newMsg.message_id)) {
                return prev;
              }
              return [...prev, newMsg];
            });
          }
          
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, selectedConversation]);

  useEffect(() => {
    if (currentTenant?.id) {
      loadConversations();
    }
  }, [currentTenant?.id]);

  // Periodic polling: reload conversations every 15 seconds to catch new messages
  useEffect(() => {
    if (!currentTenant?.id || !connectionStatus?.connected) return;
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConversation) {
        loadMessages(selectedConversation);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [currentTenant?.id, connectionStatus?.connected, selectedConversation]);

  // Auto-select contact from query param (e.g. from WhatsApp buttons)
  useEffect(() => {
    const contact = searchParams.get('contact');
    if (contact && !selectedConversation) {
      setSelectedConversation(contact);
    }
  }, [searchParams, selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const formatPhoneDisplay = (remoteJid: string) => {
    const phone = remoteJid.replace("@s.whatsapp.net", "");
    if (phone.length === 13 && phone.startsWith("55")) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Ontem";
    }
    return format(date, "dd/MM/yyyy");
  };

  const getInitials = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    return clean.slice(-2);
  };

  const filteredConversations = conversations.filter((conv) => {
    const phone = formatPhoneDisplay(conv.remote_jid);
    const name = conv.contact_name || "";
    const search = searchTerm.toLowerCase();
    return phone.includes(search) || name.toLowerCase().includes(search);
  });

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-[380px] border-r border-border/50 flex flex-col bg-card/50 ${selectedConversation ? "hidden md:flex" : "flex"}`}>
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  WhatsApp
                  {!connectionLoading && (
                    <Badge 
                      variant="secondary"
                      className={connectionStatus?.connected 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0" 
                        : "bg-destructive/20 text-destructive text-[10px] px-1.5 py-0"
                      }
                    >
                      {connectionStatus?.connected ? <Wifi className="h-2.5 w-2.5 mr-0.5" /> : <WifiOff className="h-2.5 w-2.5 mr-0.5" />}
                      {connectionStatus?.connected ? "On" : "Off"}
                    </Badge>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground">{conversations.length} conversas</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => syncMessages()}
                disabled={syncing}
                className="hover:bg-primary/10 rounded-full"
                title="Sincronizar histórico"
              >
                {syncing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={loadConversations}
                disabled={refreshing}
                className="hover:bg-primary/10 rounded-full"
                title="Atualizar conversas"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-primary/10 rounded-full"
                    title="Configurações WhatsApp"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      Configuração WhatsApp
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {/* Connection Status */}
                    {connectionLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : connectionStatus?.connected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <Wifi className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Conectado</p>
                            {connectionStatus.whatsapp_number && (
                              <p className="text-xs text-muted-foreground">
                                +{connectionStatus.whatsapp_number}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-secondary/50 rounded-xl">
                          <h4 className="font-medium text-sm mb-2">Automações Ativas</h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3 w-3 text-primary" /> Confirmação de agendamento
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3 w-3 text-primary" /> Lembrete de agendamento
                            </li>
                            <li className="flex items-center gap-1.5">
                              <Check className="h-3 w-3 text-primary" /> Notificação de cancelamento
                            </li>
                          </ul>
                        </div>

                        <Button
                          variant="outline"
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                          size="sm"
                        >
                          {disconnecting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Desconectar WhatsApp
                        </Button>
                      </div>
                    ) : qrCode ? (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center p-4 bg-white rounded-xl">
                          <img 
                            src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Abra o WhatsApp → Menu → Aparelhos Conectados → Conectar
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Aguardando conexão...
                        </div>
                        <Button variant="outline" onClick={() => setQrCode(null)} size="sm" className="w-full">
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-secondary/50 border border-border rounded-xl">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <QrCode className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Não conectado</p>
                            <p className="text-xs text-muted-foreground">
                              Conecte para ativar notificações
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Sem WhatsApp conectado, clientes não receberão notificações automáticas.
                            </p>
                          </div>
                        </div>

                        <Button
                          onClick={handleConnect}
                          disabled={connecting}
                          className="w-full"
                          size="sm"
                        >
                          {connecting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MessageCircle className="h-4 w-4 mr-2" />
                          )}
                          Conectar WhatsApp
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ou começar nova conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-xl h-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-3 space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <p className="font-medium">Nenhuma conversa</p>
              <p className="text-sm text-center mt-1">
                {searchTerm ? "Nenhum resultado encontrado" : "As mensagens aparecerão aqui"}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv, index) => (
                <motion.div
                  key={conv.remote_jid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => setSelectedConversation(conv.remote_jid)}
                  className={`flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all duration-200 mb-1 ${
                    selectedConversation === conv.remote_jid 
                      ? "bg-primary/15 border border-primary/20" 
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium">
                      {getInitials(conv.remote_jid)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-medium text-sm truncate">
                        {conv.contact_name || formatPhoneDisplay(conv.remote_jid)}
                      </p>
                      <span className={`text-xs ${
                        selectedConversation === conv.remote_jid 
                          ? "text-primary" 
                          : "text-muted-foreground"
                      }`}>
                        {formatTimestamp(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.last_message_from_me && (
                        <CheckCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                    </div>
                  </div>
                </motion.div>
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
            <div className="px-4 py-3 border-b border-border/50 bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden hover:bg-primary/10 rounded-full"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-medium text-sm">
                    {getInitials(selectedConversation)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {formatPhoneDisplay(selectedConversation)}
                  </p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-primary/10 rounded-full"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => syncMessages(selectedConversation)}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar conversa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%20width%3D%2232%22%20height%3D%2232%22%20fill%3D%22none%22%20stroke%3D%22rgba(16%2C185%2C129%2C0.03)%22%3E%3Cpath%20d%3D%22M0%2016h32M16%200v32%22%2F%3E%3C%2Fsvg%3E')]">
              <div className="p-4 space-y-2 max-w-4xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const showDate = index === 0 || 
                      format(new Date(msg.timestamp), "yyyy-MM-dd") !== 
                      format(new Date(messages[index - 1].timestamp), "yyyy-MM-dd");

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-border/30">
                              {isToday(new Date(msg.timestamp)) 
                                ? "Hoje" 
                                : isYesterday(new Date(msg.timestamp))
                                  ? "Ontem"
                                  : format(new Date(msg.timestamp), "d 'de' MMMM", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}
                        >
                          <div 
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                              msg.from_me 
                                ? "bg-primary text-primary-foreground rounded-br-md" 
                                : "bg-card border border-border/50 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              <span className="text-[10px]">
                                {format(new Date(msg.timestamp), "HH:mm")}
                              </span>
                              {msg.from_me && (
                                msg.status === "read" ? (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t border-border/50 bg-card">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-primary/10 rounded-full shrink-0 hidden sm:flex"
                >
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-primary/10 rounded-full shrink-0 hidden sm:flex"
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={sending}
                    className="bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-full h-11 pr-12"
                  />
                </div>
                {newMessage.trim() ? (
                  <Button 
                    onClick={sendMessage} 
                    disabled={sending || !newMessage.trim()}
                    size="icon"
                    className="rounded-full h-11 w-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  >
                    {sending ? (
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-11 w-11 hover:bg-primary/10"
                  >
                    <Mic className="h-5 w-5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-b from-background to-card/50">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">WhatsApp Inbox</h2>
            <p className="text-sm text-center max-w-xs">
              Selecione uma conversa para visualizar as mensagens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
