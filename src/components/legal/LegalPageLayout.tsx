import { usePageTitle } from "@/hooks/usePageTitle";
import { getPublicUrl } from "@/lib/hostname";
import { ArrowLeft } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({ title, subtitle, lastUpdated, children }: LegalPageLayoutProps) {
  usePageTitle(title);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#d4d4d4]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-[760px] mx-auto px-7 pt-12 pb-20 max-sm:px-4 max-sm:pt-6 max-sm:pb-16">
        {/* Logo */}
        <div className="text-center mb-1.5">
          <div className="inline-block bg-[#111] px-5 py-2.5 rounded-lg">
            <img
              src="https://www.modogestor.com.br/assets/modoGESTOR_branca-CMWl5nVH.png"
              alt="modoGESTOR"
              className="h-7 block"
            />
          </div>
          <small className="block text-[10px] text-[#999] tracking-[2px] uppercase mt-0.5">
            por modoPAG
          </small>
        </div>

        {/* Header */}
        <div className="text-center mb-11 pb-6 border-b-2 border-[#d4a843]">
          <h1 className="text-2xl font-extrabold text-[#f5f5f5] mb-1.5 tracking-tight">
            {title}
          </h1>
          <div className="text-[13px] text-[#666]">{subtitle}</div>
          <div className="text-[11px] text-[#aaa] mt-1">Última atualização: {lastUpdated}</div>
        </div>

        {/* Back link */}
        <a
          href={getPublicUrl("/")}
          className="inline-flex items-center gap-1 text-sm text-[#999] hover:text-[#d4a843] transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </a>

        {/* Content */}
        <div>{children}</div>

        {/* Footer */}
        <div className="mt-12 pt-5 border-t-2 border-[#d4a843] text-center text-[11px] text-[#aaa] leading-relaxed">
          <span className="text-[#d4a843] font-bold">modoGESTOR</span> é um produto da MODOPAG FINTECH LTDA — CNPJ 58.172.447/0001-28
          <br />
          Av. Maria Quitéria, 645, Sala 02, Feira de Santana – BA | contato@modogestor.com.br
        </div>
      </div>
    </div>
  );
}
