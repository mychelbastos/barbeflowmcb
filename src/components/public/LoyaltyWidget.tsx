interface LoyaltyData {
  enabled: boolean;
  stamps: number;
  stamps_required: number;
  reward_pending: boolean;
  completed_count: number;
  reward_type: string;
  reward_percent: number;
  expires_at: string | null;
  duration_months: number | null;
  expired: boolean;
}

interface LoyaltyWidgetProps {
  loyalty: LoyaltyData | null | undefined;
  variant?: "light" | "dark";
}

export function LoyaltyWidget({ loyalty, variant = "dark" }: LoyaltyWidgetProps) {
  if (!loyalty?.enabled) return null;

  const rewardLabel =
    loyalty.reward_type === "free_service"
      ? "1 serviço grátis"
      : `${loyalty.reward_percent}% de desconto`;

  // State 2: Reward pending
  if (loyalty.reward_pending) {
    return (
      <div className={variant === "dark"
        ? "bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl p-5"
        : "bg-green-50 border-2 border-green-400 rounded-xl p-5"
      }>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎉</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-lg ${variant === "dark" ? "text-emerald-300" : "text-green-800"}`}>
              Cartão completo!
            </span>
            <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              Prêmio disponível
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from({ length: loyalty.stamps_required }, (_, i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          ))}
        </div>

        <p className={`font-medium mb-3 ${variant === "dark" ? "text-emerald-300" : "text-green-800"}`}>
          🎁 Você ganhou {rewardLabel}!
        </p>

        <p className={`text-sm rounded-lg p-3 ${variant === "dark" ? "text-emerald-200/80 bg-emerald-500/10" : "text-green-700 bg-green-100"}`}>
          Para usar seu prêmio, avise o profissional no momento do atendimento. Ele vai confirmar no sistema e seu próximo cartão começará automaticamente!
        </p>
      </div>
    );
  }

  // State 3: Expired
  if (loyalty.expired) {
    return (
      <div className={variant === "dark"
        ? "bg-zinc-800/50 border border-zinc-700 rounded-xl p-4"
        : "bg-gray-50 border border-gray-200 rounded-xl p-4"
      }>
        <div className="flex items-center gap-2 mb-2">
          <span>🏆</span>
          <span className={`font-semibold ${variant === "dark" ? "text-zinc-400" : "text-gray-500"}`}>Cartão Fidelidade</span>
        </div>
        <p className={`text-sm ${variant === "dark" ? "text-zinc-500" : "text-gray-500"}`}>
          Seu cartão anterior expirou. Agende pelo app para iniciar um novo cartão com {loyalty.stamps_required} selos!
        </p>
      </div>
    );
  }

  // State 4: First booking (0 stamps)
  if (loyalty.stamps === 0) {
    return (
      <div className={variant === "dark"
        ? "bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
        : "bg-amber-50 border border-amber-200 rounded-xl p-4"
      }>
        <div className="flex items-center gap-2 mb-2">
          <span>🏆</span>
          <span className={`font-semibold ${variant === "dark" ? "text-amber-300" : "text-amber-900"}`}>Programa Fidelidade</span>
        </div>
        <p className={`text-sm ${variant === "dark" ? "text-amber-200/80" : "text-amber-700"}`}>
          A cada {loyalty.stamps_required} agendamentos pelo app, você ganha {rewardLabel}!
          {" "}Este será o seu primeiro selo ✅
          {loyalty.duration_months && (
            <span> Validade: {loyalty.duration_months} meses.</span>
          )}
        </p>
      </div>
    );
  }

  // State 1: Normal progress
  return (
    <div className={variant === "dark"
      ? "bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
      : "bg-amber-50 border border-amber-200 rounded-xl p-4"
    }>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏆</span>
        <span className={`font-semibold ${variant === "dark" ? "text-amber-300" : "text-amber-900"}`}>Cartão Fidelidade</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {Array.from({ length: loyalty.stamps_required }, (_, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < loyalty.stamps
                ? "bg-amber-500 text-white"
                : variant === "dark"
                  ? "bg-amber-500/20 text-amber-500/40 border border-amber-500/30"
                  : "bg-amber-100 text-amber-300 border border-amber-200"
            }`}
          >
            {i < loyalty.stamps ? "✓" : ""}
          </div>
        ))}
      </div>

      <p className={`text-sm ${variant === "dark" ? "text-amber-200/80" : "text-amber-700"}`}>
        {loyalty.stamps}/{loyalty.stamps_required} — Faltam{" "}
        {loyalty.stamps_required - loyalty.stamps} para seu prêmio!
      </p>

      {loyalty.expires_at && (
        <p className={`text-xs mt-1 ${variant === "dark" ? "text-amber-400/60" : "text-amber-500"}`}>
          Válido até {new Date(loyalty.expires_at).toLocaleDateString("pt-BR")}
        </p>
      )}

      <p className={`text-xs mt-1 ${variant === "dark" ? "text-amber-500/50" : "text-amber-400"}`}>
        Cada agendamento pelo app = 1 selo ✅
      </p>
    </div>
  );
}
