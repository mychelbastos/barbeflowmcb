import { MessageCircle } from "lucide-react";

interface WhatsAppContactButtonProps {
  tenantPhone: string;
  tenantName: string;
  message?: string;
  variant?: "full" | "compact";
  label?: string;
  className?: string;
}

const formatPhoneForWhatsApp = (phone: string): string => {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = "55" + digits;
  return digits;
};

export function WhatsAppContactButton({
  tenantPhone,
  tenantName,
  message,
  variant = "full",
  label,
  className = "",
}: WhatsAppContactButtonProps) {
  const handleClick = () => {
    const phone = formatPhoneForWhatsApp(tenantPhone);
    const defaultMsg = `Olá! Estou na página de agendamento da ${tenantName} e gostaria de ajuda.`;
    const text = encodeURIComponent(message || defaultMsg);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors ${className}`}
      >
        <MessageCircle className="w-4 h-4" />
        {label || "Falar sobre este horário"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 w-full py-3 px-4 
        bg-emerald-600/10 hover:bg-emerald-600/20 
        border border-emerald-600/20 hover:border-emerald-600/30
        text-emerald-400 rounded-lg transition-all text-sm font-medium ${className}`}
    >
      <MessageCircle className="w-5 h-5" />
      {label || "Falar com a barbearia"}
    </button>
  );
}
