import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, CalendarPlus, ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SubscriptionCallback() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get('status') || searchParams.get('preapproval_id') ? 'authorized' : 'unknown';
  const isSuccess = status === 'authorized' || searchParams.get('preapproval_id');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease }}
        className="max-w-md w-full text-center space-y-6"
      >
        {isSuccess ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                Assinatura ativada! <Sparkles className="h-5 w-5 text-amber-400" />
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sua assinatura foi autorizada com sucesso. A cobrança será feita automaticamente a cada ciclo. Você já pode agendar seus serviços inclusos!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => navigate(`/${slug}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12 text-base"
              >
                <CalendarPlus className="h-5 w-5 mr-2" />
                Agendar agora
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate(`/${slug}`)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar à página inicial
              </Button>
            </div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
              className="mx-auto w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"
            >
              <XCircle className="h-10 w-10 text-red-400" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Assinatura não concluída</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                A autorização da assinatura não foi finalizada. Você pode tentar novamente na página de agendamento.
              </p>
            </div>

            <Button
              onClick={() => navigate(`/${slug}`)}
              className="w-full h-12"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
