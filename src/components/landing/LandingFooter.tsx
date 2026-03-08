import logoBranca from "@/assets/modoGESTOR_branca.png";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.05] py-12 px-5 sm:px-8 bg-[#050505]">
      <div className="max-w-[900px] mx-auto grid sm:grid-cols-3 gap-8">
        <div>
          <img
            src={logoBranca}
            alt="modoGESTOR"
            className="h-5 mb-3 opacity-60"
          />
          <p className="text-xs text-zinc-600 leading-relaxed">
            Um produto da MODOPAG FINTECH LTDA
            <br />
            CNPJ: 58.172.447/0001-28
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em] mb-3">
            Links
          </h4>
          <div className="flex flex-col gap-2">
            <a
              href="/termos-de-uso"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Termos de Uso
            </a>
            <a
              href="/politica-de-privacidade"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Política de Privacidade
            </a>
            <a
              href="/politica-de-reembolso"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Política de Reembolso
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em] mb-3">
            Contato
          </h4>
          <div className="flex flex-col gap-2 text-xs text-zinc-600">
            <p>contato@modogestor.com.br</p>
            <p>(75) 99205-0743</p>
            <p>Feira de Santana — BA</p>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto mt-10 pt-6 border-t border-white/[0.04] space-y-4">
        <p className="text-[10px] text-zinc-600 leading-relaxed max-w-xl mx-auto text-center">
          <span className="text-zinc-500 font-medium">Sobre as taxas de transação:</span>{" "}
          A taxa do modoGESTOR (2,5% ou 1,5%) é cobrada apenas sobre pagamentos online
          processados pela plataforma. As taxas do gateway (Mercado Pago) são cobradas
          separadamente conforme seu contrato. O modoGESTOR não interfere nas taxas do seu banco ou gateway.
        </p>
        <p className="text-[10px] text-zinc-700 text-center tracking-wide">
          © 2026 modoGESTOR. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
