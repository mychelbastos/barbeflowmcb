import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Check, ChevronLeft, Shield, Lock, CreditCard } from 'lucide-react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface SubscriptionCardPaymentProps {
  tenantSlug: string;
  tenantId: string;
  planId: string;
  planName: string;
  priceCents: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  onSuccess: () => void;
  onBack: () => void;
}

type Status = 'loading' | 'card-form' | 'ready' | 'processing' | 'success' | 'error';

export function SubscriptionCardPayment({
  tenantSlug,
  tenantId,
  planId,
  planName,
  priceCents,
  customerName,
  customerPhone,
  customerEmail,
  onSuccess,
  onBack,
}: SubscriptionCardPaymentProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const brickControllerRef = useRef<any>(null);
  const publicKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadSDKAndKey();
    return () => {
      isMountedRef.current = false;
      if (brickControllerRef.current) {
        try { brickControllerRef.current.unmount(); } catch {}
        brickControllerRef.current = null;
      }
    };
  }, []);

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MercadoPago SDK'));
      document.body.appendChild(script);
    });
  };

  const loadSDKAndKey = async () => {
    try {
      if (!window.MercadoPago) {
        await loadScript('https://sdk.mercadopago.com/js/v2');
      }
      if (!isMountedRef.current) return;

      const { data, error } = await supabase.functions.invoke('mp-get-public-key', {
        body: { slug: tenantSlug },
      });

      if (!isMountedRef.current) return;
      if (error || !data?.public_key) {
        throw new Error('Chave pública do Mercado Pago não encontrada');
      }

      publicKeyRef.current = data.public_key;
      setStatus('card-form');

      requestAnimationFrame(() => {
        setTimeout(() => initializeCardBrick(), 50);
      });
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setErrorMessage(err.message || 'Erro ao carregar pagamento');
      setStatus('error');
    }
  };

  const initializeCardBrick = useCallback(async () => {
    if (!isMountedRef.current || !publicKeyRef.current) return;

    const container = document.getElementById('subscriptionCardBrick_container');
    if (!container) {
      setErrorMessage('Erro ao carregar formulário');
      setStatus('error');
      return;
    }

    try {
      const mp = new window.MercadoPago(publicKeyRef.current, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();
      if (!isMountedRef.current) return;

      brickControllerRef.current = await bricksBuilder.create('cardPayment', 'subscriptionCardBrick_container', {
        initialization: {
          amount: priceCents / 100,
          payer: { email: customerEmail },
        },
        customization: {
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: 1,
          },
          visual: {
            style: {
              theme: 'dark',
              customVariables: {
                baseColor: '#FFC300',
                fontSizeExtraSmall: '12px',
                fontSizeSmall: '14px',
                fontSizeMedium: '16px',
                fontSizeLarge: '18px',
                borderRadiusMedium: '12px',
                borderRadiusLarge: '16px',
                formBackgroundColor: 'transparent',
                baseColorFirstVariant: '#1a1a1a',
                baseColorSecondVariant: '#262626',
                inputBackgroundColor: '#1a1a1a',
                formPadding: '0px',
              },
            },
            hideFormTitle: true,
          },
        },
        callbacks: {
          onReady: () => {
            if (!isMountedRef.current) return;
            setStatus('ready');
          },
          onSubmit: async (formData: any) => {
            if (!isMountedRef.current) return;
            await handleCardSubmit(formData);
          },
          onError: (error: any) => {
            if (!isMountedRef.current) return;
            console.error('CardPayment Brick error:', error);
            setErrorMessage('Erro no formulário de pagamento');
          },
        },
      });
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setErrorMessage(err.message || 'Erro ao carregar formulário');
      setStatus('error');
    }
  }, [priceCents, customerEmail]);

  const handleCardSubmit = async (formData: any) => {
    if (!isMountedRef.current) return;
    setStatus('processing');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('mp-create-subscription', {
        body: {
          tenant_id: tenantId,
          plan_id: planId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          card_token_id: formData.token,
        },
      });

      if (!isMountedRef.current) return;
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.activated) {
        setStatus('success');
        setTimeout(() => onSuccess(), 2000);
      } else if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setStatus('success');
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Subscription payment error:', err);
      setErrorMessage(err.message || 'Erro ao processar assinatura');
      setStatus('error');
    }
  };

  const retry = () => {
    setErrorMessage('');
    if (brickControllerRef.current) {
      try { brickControllerRef.current.unmount(); } catch {}
    }
    setStatus('loading');
    loadSDKAndKey();
  };

  const priceFormatted = (priceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (status === 'success') {
    return (
      <div className="text-center py-10">
        <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5 animate-in zoom-in duration-300">
          <Check className="h-10 w-10 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Assinatura ativada!</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Sua assinatura do plano <span className="font-medium text-foreground">{planName}</span> está ativa. Você será redirecionado em instantes.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-10">
        <div className="w-20 h-20 bg-destructive/10 border-2 border-destructive/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Erro no pagamento</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">{errorMessage}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={retry} className="rounded-xl px-6">
            Tentar novamente
          </Button>
          <Button onClick={onBack} variant="ghost" className="rounded-xl">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-full border-2 border-muted flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <Loader2 className="h-14 w-14 animate-spin text-primary absolute top-0 left-0" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Carregando pagamento seguro...</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Plan summary header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30 p-4">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{planName}</h3>
              <p className="text-xs text-muted-foreground">Assinatura mensal</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold">R$ {priceFormatted}</span>
            <span className="text-xs text-muted-foreground block">/mês</span>
          </div>
        </div>
      </div>

      {/* Processing overlay */}
      {status === 'processing' && (
        <div className="flex flex-col items-center justify-center py-8 animate-in fade-in duration-200">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-muted-foreground text-sm font-medium">Processando assinatura...</span>
          <span className="text-muted-foreground/60 text-xs mt-1">Não feche esta página</span>
        </div>
      )}

      {/* Card form container */}
      <div
        id="subscriptionCardBrick_container"
        className="subscription-brick-wrapper"
        style={{ display: status === 'processing' ? 'none' : 'block' }}
      />

      {/* Security footer */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          <Lock className="h-3 w-3" />
          <span className="text-[11px]">Criptografado</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          <Shield className="h-3 w-3" />
          <span className="text-[11px]">Pagamento seguro</span>
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mx-auto transition-colors text-sm"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </button>
    </div>
  );
}
