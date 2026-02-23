import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

interface Props {
  tenantId: string | undefined;
}

export function PushNotificationToggle({ tenantId }: Props) {
  const { status, loading, subscribe, unsubscribe } = usePushNotifications(tenantId);
  const { toast } = useToast();

  if (status === 'unsupported' || status === 'loading') return null;

  const handleToggle = async () => {
    if (status === 'subscribed') {
      const ok = await unsubscribe();
      if (ok) toast({ title: "Notificações desativadas" });
    } else {
      const ok = await subscribe();
      if (ok) {
        toast({ title: "Notificações ativadas! 🔔", description: "Você receberá alertas de novos agendamentos e cancelamentos." });
      } else if (status === 'denied') {
        toast({ title: "Permissão negada", description: "Habilite as notificações nas configurações do navegador.", variant: "destructive" });
      }
    }
  };

  const icon = status === 'subscribed' ? <BellRing className="h-4 w-4" /> 
    : status === 'denied' ? <BellOff className="h-4 w-4" />
    : <Bell className="h-4 w-4" />;

  const label = status === 'subscribed' ? 'Notificações ativas'
    : status === 'denied' ? 'Notificações bloqueadas'
    : 'Ativar notificações';

  return (
    <Button
      variant={status === 'subscribed' ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading || status === 'denied'}
      className="gap-2 shrink-0"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
