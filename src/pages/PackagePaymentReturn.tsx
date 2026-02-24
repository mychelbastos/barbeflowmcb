import { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Package, Check, Clock, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PackagePaymentReturn() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'approved' | 'pending' | 'failed'>('loading');

  const mpStatus = searchParams.get('status') || searchParams.get('collection_status');

  useEffect(() => {
    if (mpStatus === 'approved') {
      setStatus('approved');
    } else if (mpStatus === 'pending' || mpStatus === 'in_process') {
      setStatus('pending');
    } else if (mpStatus) {
      setStatus('failed');
    } else {
      // No status param — check payment_id polling could go here
      setStatus('pending');
    }
  }, [mpStatus]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        {status === 'loading' && (
          <Loader2 className="h-10 w-10 animate-spin text-zinc-500 mx-auto" />
        )}

        {status === 'approved' && (
          <>
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Pagamento aprovado!</h1>
            <p className="text-sm text-zinc-400">
              Seu pacote foi ativado com sucesso. Você já pode agendar seus serviços.
            </p>
            <Button
              onClick={() => navigate(`/${slug}?tab=services`)}
              className="w-full bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl h-12"
            >
              Agendar agora
            </Button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-10 w-10 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold">Pagamento em processamento</h1>
            <p className="text-sm text-zinc-400">
              Seu pagamento está sendo processado. O pacote será ativado automaticamente quando confirmado.
            </p>
            <Button
              onClick={() => navigate(`/${slug}`)}
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 rounded-xl h-12"
            >
              Voltar à página
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold">Pagamento não aprovado</h1>
            <p className="text-sm text-zinc-400">
              Houve um problema com seu pagamento. Tente novamente ou escolha outra forma de pagamento.
            </p>
            <Button
              onClick={() => navigate(`/${slug}?tab=packages`)}
              className="w-full bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl h-12"
            >
              Tentar novamente
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
