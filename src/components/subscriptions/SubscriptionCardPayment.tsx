import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Check, ChevronLeft } from 'lucide-react';

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

      // Wait for container to render, then init brick
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
        // Fallback to redirect if card token wasn't accepted
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

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Assinatura ativada!</h3>
        <p className="text-zinc-400 text-sm">Sua assinatura do plano {planName} está ativa.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Erro no pagamento</h3>
        <p className="text-zinc-400 text-sm mb-4">{errorMessage}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={retry} variant="outline" className="rounded-xl">
            Tentar novamente
          </Button>
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm transition-colors">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400 text-sm">Carregando pagamento seguro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="font-semibold">Dados do cartão</h3>
        <p className="text-zinc-500 text-sm">{planName} — R$ {(priceCents / 100).toFixed(2)}/mês</p>
      </div>

      {status === 'processing' && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mr-2" />
          <span className="text-zinc-400 text-sm">Processando assinatura...</span>
        </div>
      )}

      <div
        id="subscriptionCardBrick_container"
        style={{ display: status === 'processing' ? 'none' : 'block' }}
      />

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </button>
    </div>
  );
}
