import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function SubscriptionCallback() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // MP returns preapproval_id and status in query params
  const status = searchParams.get('status') || searchParams.get('preapproval_id') ? 'authorized' : 'unknown';
  const isSuccess = status === 'authorized' || searchParams.get('preapproval_id');

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {isSuccess ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Assinatura ativada!</h1>
            <p className="text-muted-foreground">
              Sua assinatura foi autorizada com sucesso. A cobrança será feita automaticamente todo mês.
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Assinatura não concluída</h1>
            <p className="text-muted-foreground">
              A autorização da assinatura não foi finalizada. Você pode tentar novamente na página de agendamento.
            </p>
          </>
        )}

        <Button onClick={() => navigate(`/${slug}`)} className="w-full">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao agendamento
        </Button>
      </div>
    </div>
  );
}
