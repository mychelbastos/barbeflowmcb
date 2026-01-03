import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle, Check, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PayerInfo {
  email: string;
  identification?: {
    type: string;
    number: string;
  };
}

interface MercadoPagoCheckoutProps {
  bookingId: string;
  tenantSlug: string;
  amount: number;
  serviceName: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onPending?: (paymentData: any) => void;
  payer: PayerInfo;
}

type PaymentMethod = 'card' | 'pix' | null;
type PaymentStatus = 'idle' | 'loading' | 'method-select' | 'ready' | 'processing' | 'pix-waiting' | 'success' | 'error' | 'pending';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export const MercadoPagoCheckout = ({
  bookingId,
  tenantSlug,
  amount,
  serviceName,
  onSuccess,
  onError,
  onPending,
  payer,
}: MercadoPagoCheckoutProps) => {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const brickControllerRef = useRef<any>(null);
  const publicKeyRef = useRef<string | null>(null);

  useEffect(() => {
    loadPublicKey();

    return () => {
      if (brickControllerRef.current) {
        try {
          brickControllerRef.current.unmount();
        } catch (e) {
          console.log('Cleanup error:', e);
        }
      }
    };
  }, []);

  const loadPublicKey = async () => {
    setStatus('loading');

    try {
      // Load SDK script if not already loaded
      if (!window.MercadoPago) {
        await loadScript('https://sdk.mercadopago.com/js/v2');
      }

      // Get public key from backend
      const { data: keyData, error: keyError } = await supabase.functions.invoke('mp-get-public-key', {
        body: { slug: tenantSlug },
      });

      if (keyError || !keyData?.public_key) {
        throw new Error(keyData?.error || 'Não foi possível obter a chave do Mercado Pago');
      }

      publicKeyRef.current = keyData.public_key;
      setStatus('method-select');

    } catch (error: any) {
      console.error('Error loading MP SDK:', error);
      setErrorMessage(error.message || 'Erro ao carregar o pagamento');
      setStatus('error');
    }
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MercadoPago SDK'));
      document.body.appendChild(script);
    });
  };

  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    setPaymentMethod(method);

    if (method === 'card') {
      await initializeCardBrick();
    } else if (method === 'pix') {
      await processPixPayment();
    }
  };

  const initializeCardBrick = async () => {
    setStatus('loading');

    try {
      const mp = new window.MercadoPago(publicKeyRef.current, {
        locale: 'pt-BR',
      });

      const bricksBuilder = mp.bricks();

      brickControllerRef.current = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
        initialization: {
          amount: amount,
          payer: {
            email: payer.email,
          },
        },
        customization: {
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: 1, // Only à vista
          },
          visual: {
            style: {
              theme: 'dark',
              customVariables: {
                baseColor: '#18181b',
                fontSizeExtraSmall: '12px',
                fontSizeSmall: '14px',
                fontSizeMedium: '16px',
                fontSizeLarge: '18px',
                borderRadiusMedium: '12px',
                borderRadiusLarge: '16px',
              },
            },
            hideFormTitle: true,
          },
        },
        callbacks: {
          onReady: () => {
            console.log('CardPayment Brick ready');
            setStatus('ready');
          },
          onSubmit: async (formData: any) => {
            console.log('Payment form submitted:', formData);
            await handleCardPaymentSubmit(formData);
          },
          onError: (error: any) => {
            console.error('CardPayment Brick error:', error);
            setErrorMessage('Erro no formulário de pagamento');
          },
        },
      });

    } catch (error: any) {
      console.error('Error initializing card brick:', error);
      setErrorMessage(error.message || 'Erro ao carregar formulário de cartão');
      setStatus('error');
    }
  };

  const handleCardPaymentSubmit = async (formData: any) => {
    setStatus('processing');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('mp-process-payment', {
        body: {
          booking_id: bookingId,
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          payment_type: 'card',
          payer: {
            email: formData.payer?.email || payer.email,
            identification: formData.payer?.identification,
          },
        },
      });

      if (error) throw error;

      console.log('Payment result:', data);

      if (data.status === 'approved') {
        setStatus('success');
        onSuccess(data);
      } else if (data.status === 'pending' || data.status === 'in_process') {
        setStatus('pending');
        onPending?.(data);
      } else {
        throw new Error(getStatusMessage(data.status, data.status_detail));
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'Erro ao processar pagamento');
      setStatus('error');
      onError(error.message);
    }
  };

  const processPixPayment = async () => {
    setStatus('processing');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('mp-process-payment', {
        body: {
          booking_id: bookingId,
          payment_type: 'pix',
          payer: {
            email: payer.email,
            identification: payer.identification,
          },
        },
      });

      if (error) throw error;

      console.log('PIX result:', data);

      if (data.pix) {
        setPixData(data.pix);
        setStatus('pix-waiting');
      } else if (data.status === 'approved') {
        setStatus('success');
        onSuccess(data);
      } else {
        throw new Error('Não foi possível gerar o QR Code PIX');
      }

    } catch (error: any) {
      console.error('PIX error:', error);
      setErrorMessage(error.message || 'Erro ao gerar PIX');
      setStatus('error');
      onError(error.message);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qr_code) {
      try {
        await navigator.clipboard.writeText(pixData.qr_code);
        setCopied(true);
        toast({ title: 'Código PIX copiado!' });
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast({ title: 'Erro ao copiar', variant: 'destructive' });
      }
    }
  };

  const getStatusMessage = (status: string, statusDetail?: string): string => {
    const messages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Número do cartão incorreto',
      cc_rejected_bad_filled_date: 'Data de validade incorreta',
      cc_rejected_bad_filled_other: 'Dados do cartão incorretos',
      cc_rejected_bad_filled_security_code: 'Código de segurança incorreto',
      cc_rejected_blacklist: 'Cartão não permitido',
      cc_rejected_call_for_authorize: 'Você deve autorizar o pagamento',
      cc_rejected_card_disabled: 'Cartão desativado',
      cc_rejected_card_error: 'Erro no cartão',
      cc_rejected_duplicated_payment: 'Pagamento duplicado',
      cc_rejected_high_risk: 'Pagamento rejeitado',
      cc_rejected_insufficient_amount: 'Saldo insuficiente',
      cc_rejected_invalid_installments: 'Parcelas inválidas',
      cc_rejected_max_attempts: 'Limite de tentativas excedido',
      rejected: 'Pagamento rejeitado',
    };

    return messages[statusDetail || ''] || messages[status] || 'Pagamento não aprovado';
  };

  const retryPayment = () => {
    setErrorMessage('');
    setPaymentMethod(null);
    setPixData(null);
    if (brickControllerRef.current) {
      try {
        brickControllerRef.current.unmount();
      } catch (e) {}
    }
    setStatus('method-select');
  };

  const goBackToMethodSelect = () => {
    setPaymentMethod(null);
    setPixData(null);
    if (brickControllerRef.current) {
      try {
        brickControllerRef.current.unmount();
      } catch (e) {}
    }
    setStatus('method-select');
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Pagamento aprovado!</h3>
        <p className="text-muted-foreground text-sm">Seu agendamento foi confirmado.</p>
      </div>
    );
  }

  // Pending state
  if (status === 'pending') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Pagamento em processamento</h3>
        <p className="text-muted-foreground text-sm">Aguardando confirmação do pagamento.</p>
      </div>
    );
  }

  // Loading state
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">Carregando pagamento seguro...</p>
      </div>
    );
  }

  // Error state with retry
  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Erro no pagamento</h3>
        <p className="text-muted-foreground text-sm mb-4">{errorMessage}</p>
        <Button onClick={retryPayment} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Payment method selection
  if (status === 'method-select') {
    return (
      <div className="space-y-4">
        {/* Payment info */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
          <span className="text-sm text-muted-foreground">{serviceName}</span>
          <span className="font-semibold text-emerald-400">
            R$ {amount.toFixed(2)}
          </span>
        </div>

        <p className="text-center text-sm text-muted-foreground">Escolha a forma de pagamento:</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSelectPaymentMethod('card')}
            className="flex flex-col items-center gap-2 p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary/80 hover:border-primary/50 transition-all"
          >
            <CreditCard className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Cartão de Crédito</span>
            <span className="text-xs text-muted-foreground">À vista</span>
          </button>

          <button
            onClick={() => handleSelectPaymentMethod('pix')}
            className="flex flex-col items-center gap-2 p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary/80 hover:border-primary/50 transition-all"
          >
            <QrCode className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">PIX</span>
            <span className="text-xs text-muted-foreground">Instantâneo</span>
          </button>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <span className="text-xs text-muted-foreground">Pagamento seguro via Mercado Pago</span>
        </div>
      </div>
    );
  }

  // PIX waiting state
  if (status === 'pix-waiting' && pixData) {
    return (
      <div className="space-y-4">
        {/* Payment info */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{serviceName}</span>
          </div>
          <span className="font-semibold text-emerald-400">
            R$ {amount.toFixed(2)}
          </span>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium mb-4">Escaneie o QR Code ou copie o código PIX:</p>
          
          {/* QR Code */}
          {pixData.qr_code_base64 && (
            <div className="inline-block p-4 bg-white rounded-xl mb-4">
              <img 
                src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                alt="QR Code PIX" 
                className="w-48 h-48"
              />
            </div>
          )}

          {/* Copy code button */}
          <Button 
            onClick={copyPixCode} 
            variant="outline" 
            className="w-full gap-2"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Código copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar código PIX
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Após o pagamento, a confirmação pode levar alguns segundos.
          </p>
        </div>

        {/* Back button */}
        <Button onClick={goBackToMethodSelect} variant="ghost" className="w-full">
          Voltar e escolher outra forma de pagamento
        </Button>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <span className="text-xs text-muted-foreground">Pagamento seguro via Mercado Pago</span>
        </div>
      </div>
    );
  }

  // Card form state
  return (
    <div className="space-y-4">
      {/* Payment info */}
      <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{serviceName}</span>
        </div>
        <span className="font-semibold text-emerald-400">
          R$ {amount.toFixed(2)}
        </span>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </p>
        </div>
      )}

      {/* Card Payment Brick container */}
      <div 
        id="cardPaymentBrick_container" 
        className="mp-checkout-container"
      />

      {/* Back button */}
      <Button onClick={goBackToMethodSelect} variant="ghost" className="w-full">
        Voltar e escolher outra forma de pagamento
      </Button>

      {/* Processing overlay */}
      {status === 'processing' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl text-center border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-foreground mx-auto mb-4" />
            <p className="text-foreground">Processando pagamento...</p>
          </div>
        </div>
      )}

      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
        <span className="text-xs text-muted-foreground">Pagamento seguro via Mercado Pago</span>
      </div>
    </div>
  );
};
