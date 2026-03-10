import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle, Check, QrCode, Copy, CheckCircle2, Lock, Shield, ChevronRight, Pencil } from 'lucide-react';
import { formatCep } from '@/components/BillingAddressForm';
import { toast } from '@/hooks/use-toast';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { BillingAddressForm, isBillingAddressComplete, type BillingAddress } from '@/components/BillingAddressForm';
import { PaymentErrorAlert, parsePaymentResult, type PaymentError, type PaymentPending } from '@/components/PaymentErrorAlert';

interface PayerInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  identification?: {
    type: string;
    number: string;
  };
}

interface MercadoPagoCheckoutProps {
  bookingId?: string;
  tenantSlug: string;
  amount: number;
  serviceName: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onPending?: (paymentData: any) => void;
  payer: PayerInfo;
  customerPackageId?: string;
  packageAmountCents?: number;
  paymentId?: string;
  onlineDiscountPercent?: number;
  originalAmountCents?: number;
}

const getFunctionErrorMessage = (error: any): string => {
  if (!error) return 'Erro ao processar pagamento';
  const context = error.context;
  if (typeof context === 'string' && context.trim()) {
    try {
      const parsed = JSON.parse(context);
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
      if (parsed?.details?.message) return String(parsed.details.message);
    } catch {
      return context;
    }
  }
  return error.message || 'Erro ao processar pagamento';
};

type PaymentMethod = 'card' | 'pix' | null;
type PaymentStatus = 'idle' | 'loading' | 'method-select' | 'card-form' | 'ready' | 'processing' | 'pix-waiting' | 'success' | 'error' | 'pending';

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
  customerPackageId,
  packageAmountCents,
  paymentId: externalPaymentId,
  onlineDiscountPercent = 0,
  originalAmountCents,
}: MercadoPagoCheckoutProps) => {
  const isPackagePayment = !!customerPackageId && !bookingId;
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [checkoutStep, setCheckoutStep] = useState<'address' | 'card'>('address');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [useCheckoutRedirect, setUseCheckoutRedirect] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    zip_code: '', street_name: '', street_number: '',
    neighborhood: '', city: '', federal_unit: '',
  });
  const brickControllerRef = useRef<any>(null);
  const publicKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardSectionRef = useRef<HTMLDivElement>(null);
  const turnstileTokenRef = useRef<string | null>(null);
  turnstileTokenRef.current = turnstileToken;
  // Ref for billing address in Brick callback
  const billingAddressRef = useRef<BillingAddress>(billingAddress);
  billingAddressRef.current = billingAddress;

  useEffect(() => {
    isMountedRef.current = true;
    loadPublicKey();
    return () => {
      isMountedRef.current = false;
      if (brickControllerRef.current) {
        try { brickControllerRef.current.unmount(); } catch (e) {}
        brickControllerRef.current = null;
      }
    };
  }, []);

  const loadPublicKey = async () => {
    if (!isMountedRef.current) return;
    setStatus('loading');
    try {
      if (!window.MercadoPago) {
        await loadScript('https://sdk.mercadopago.com/js/v2');
      }
      if (!isMountedRef.current) return;
      const { data: keyData, error: keyError } = await supabase.functions.invoke('mp-get-public-key', {
        body: { slug: tenantSlug },
      });
      if (!isMountedRef.current) return;
      if (keyError || !keyData?.public_key) {
        if (!bookingId) {
          setErrorMessage('Erro ao carregar pagamento. Verifique se o Mercado Pago está conectado.');
          setStatus('error');
          return;
        }
        console.log('No public_key available, using checkout redirect fallback');
        setUseCheckoutRedirect(true);
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('mp-create-checkout', {
          body: { booking_id: bookingId },
        });
        if (!isMountedRef.current) return;
        if (checkoutError || !checkoutData?.checkout_url) {
          throw new Error(checkoutData?.error || 'Erro ao criar checkout do Mercado Pago');
        }
        setCheckoutUrl(checkoutData.checkout_url);
        setStatus('method-select');
        return;
      }
      publicKeyRef.current = keyData.public_key;
      setStatus('method-select');
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error loading MP SDK:', error);
      setErrorMessage(error.message || 'Erro ao carregar o pagamento');
      setStatus('error');
    }
  };

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

  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'card') {
      setStatus('card-form');
      requestAnimationFrame(() => {
        setTimeout(() => initializeCardBrick(), 50);
      });
    } else if (method === 'pix') {
      await processPixPayment();
    }
  };

  const initializeCardBrick = useCallback(async () => {
    if (!isMountedRef.current) return;
    const container = document.getElementById('cardPaymentBrick_container');
    if (!container) {
      console.error('Card payment container not found');
      setErrorMessage('Erro ao carregar formulário');
      setStatus('error');
      return;
    }
    try {
      const mp = new window.MercadoPago(publicKeyRef.current, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();
      if (!isMountedRef.current) return;
      brickControllerRef.current = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
        initialization: {
          amount: amount,
          payer: {
            email: payer.email,
            firstName: payer.firstName,
            lastName: payer.lastName,
            identification: payer.identification,
          },
        },
        customization: {
          paymentMethods: { minInstallments: 1, maxInstallments: 1 },
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
            console.log('CardPayment Brick ready');
            setStatus('ready');
          },
          onSubmit: async (formData: any) => {
            if (!isMountedRef.current) return;
            console.log('Payment form submitted:', formData);
            // Use refs to get latest values (avoids stale closure)
            const currentToken = turnstileTokenRef.current;
            const currentAddress = billingAddressRef.current;
            
            if (!currentToken) {
              setErrorMessage('Aguarde a verificação de segurança antes de pagar.');
              setTurnstileKey(k => k + 1);
              return;
            }
            if (!isBillingAddressComplete(currentAddress)) {
              setErrorMessage('Preencha o endereço de cobrança completo.');
              return;
            }
            await handleCardPaymentSubmitWithRefs(formData, currentToken, currentAddress);
          },
          onError: (error: any) => {
            if (!isMountedRef.current) return;
            console.error('CardPayment Brick error:', error);
            setErrorMessage('Erro no formulário de pagamento');
          },
        },
      });
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error initializing card brick:', error);
      setErrorMessage(error.message || 'Erro ao carregar formulário de cartão');
      setStatus('error');
    }
  }, [amount, payer.email]);

  const handleCardPaymentSubmitWithRefs = async (formData: any, token: string, address: BillingAddress) => {
    if (!isMountedRef.current) return;
    setStatus('processing');
    setErrorMessage('');
    try {
      const { data, error } = await supabase.functions.invoke(
        isPackagePayment ? 'mp-process-package-payment' : 'mp-process-payment',
        {
          body: isPackagePayment
            ? {
                customer_package_id: customerPackageId,
                payment_id: externalPaymentId,
                token: formData.token,
                payment_method_id: formData.payment_method_id,
                payment_type: 'card',
                cf_turnstile_token: token,
                billing_address: {
                  zip_code: address.zip_code,
                  street_name: address.street_name,
                  street_number: address.street_number,
                  neighborhood: address.neighborhood,
                  city: address.city,
                  federal_unit: address.federal_unit,
                },
                payer: {
                  email: formData.payer?.email || payer.email,
                  identification: formData.payer?.identification,
                },
                device_id: (window as any).MP_DEVICE_SESSION_ID || undefined,
              }
            : {
                booking_id: bookingId,
                token: formData.token,
                payment_method_id: formData.payment_method_id,
                payment_type: 'card',
                cf_turnstile_token: token,
                billing_address: {
                  zip_code: address.zip_code,
                  street_name: address.street_name,
                  street_number: address.street_number,
                  neighborhood: address.neighborhood,
                  city: address.city,
                  federal_unit: address.federal_unit,
                },
                payer: {
                  email: formData.payer?.email || payer.email,
                  identification: formData.payer?.identification,
                },
                customer_package_id: customerPackageId || undefined,
                package_amount_cents: packageAmountCents || undefined,
                device_id: (window as any).MP_DEVICE_SESSION_ID || undefined,
              },
        }
      );
      if (!isMountedRef.current) return;
      if (error) throw new Error(getFunctionErrorMessage(error));
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
      if (!isMountedRef.current) return;
      console.error('Payment error:', error);
      setTurnstileToken(null);
      setTurnstileKey(k => k + 1);
      setErrorMessage(error.message || 'Erro ao processar pagamento');
      setStatus('error');
      onError(error.message);
    }
  };

  // State for payment polling
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingAttemptsRef = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60;

  const pollPaymentStatus = useCallback(async (paymentIdToCheck: string) => {
    if (!isMountedRef.current) return;
    pollingAttemptsRef.current += 1;
    if (pollingAttemptsRef.current > MAX_POLLING_ATTEMPTS) {
      if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
      setErrorMessage('Tempo esgotado aguardando confirmação do pagamento. Verifique seu app do banco.');
      setStatus('error');
      return;
    }
    try {
      const { data: rpcData, error } = await supabase.rpc('get_payment_status', { p_payment_id: paymentIdToCheck });
      if (error) { console.error('Error polling payment status:', error); return; }
      if (!rpcData || (Array.isArray(rpcData) && rpcData.length === 0)) return;
      const payment = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (payment.status === 'paid') {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setStatus('success');
        onSuccess({ status: 'approved', payment_id: paymentIdToCheck });
      } else if (payment.status === 'failed' || payment.status === 'cancelled') {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setErrorMessage('Pagamento não foi aprovado');
        setStatus('error');
      }
    } catch (err) { console.error('Polling error:', err); }
  }, [onSuccess]);

  useEffect(() => {
    if (status === 'pix-waiting' && paymentId) {
      pollingAttemptsRef.current = 0;
      pollingIntervalRef.current = setInterval(() => { pollPaymentStatus(paymentId); }, 3000);
      pollPaymentStatus(paymentId);
    }
    return () => {
      if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
    };
  }, [status, paymentId, pollPaymentStatus]);

  const processPixPayment = async () => {
    if (!isMountedRef.current) return;
    setStatus('processing');
    setErrorMessage('');
    try {
      const { data, error } = await supabase.functions.invoke(
        isPackagePayment ? 'mp-process-package-payment' : 'mp-process-payment',
        {
          body: isPackagePayment
            ? {
                customer_package_id: customerPackageId,
                payment_id: externalPaymentId,
                payment_type: 'pix',
                payer: { email: payer.email, identification: payer.identification },
                device_id: (window as any).MP_DEVICE_SESSION_ID || undefined,
              }
            : {
                booking_id: bookingId,
                payment_type: 'pix',
                payer: { email: payer.email, identification: payer.identification },
                customer_package_id: customerPackageId || undefined,
                package_amount_cents: packageAmountCents || undefined,
                device_id: (window as any).MP_DEVICE_SESSION_ID || undefined,
              },
        }
      );
      if (!isMountedRef.current) return;
      if (error) throw new Error(getFunctionErrorMessage(error));
      console.log('PIX result:', data);
      if (data.pix) {
        setPixData(data.pix);
        if (data.payment_id) setPaymentId(data.payment_id);
        setStatus('pix-waiting');
      } else if (data.status === 'approved') {
        setStatus('success');
        onSuccess(data);
      } else {
        throw new Error('Não foi possível gerar o QR Code PIX');
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
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
    setTurnstileToken(null);
    setTurnstileKey(k => k + 1);
    setCheckoutStep('address');
    if (brickControllerRef.current) { try { brickControllerRef.current.unmount(); } catch (e) {} }
    setStatus('method-select');
  };

  const goBackToMethodSelect = () => {
    setPaymentMethod(null);
    setPixData(null);
    setTurnstileToken(null);
    setTurnstileKey(k => k + 1);
    setCheckoutStep('address');
    if (brickControllerRef.current) { try { brickControllerRef.current.unmount(); } catch (e) {} }
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
        <p className="text-muted-foreground text-sm">
          {isPackagePayment ? 'Seu pacote foi ativado com sucesso!' : 'Seu agendamento foi confirmado.'}
        </p>
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

  // Error state
  if (status === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Erro no pagamento</h3>
        <p className="text-muted-foreground text-sm mb-4">{errorMessage}</p>
        <Button onClick={retryPayment} variant="outline">Tentar novamente</Button>
      </div>
    );
  }

  // Payment method selection
  if (status === 'method-select') {
    if (useCheckoutRedirect && checkoutUrl) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
            <span className="text-sm text-muted-foreground">{serviceName}</span>
            <span className="font-semibold text-primary">R$ {amount.toFixed(2)}</span>
          </div>
          <p className="text-center text-sm text-muted-foreground">Você será redirecionado para concluir o pagamento.</p>
          <Button onClick={() => window.location.href = checkoutUrl} className="w-full gap-2" size="lg">
            <CreditCard className="h-5 w-5" /> Pagar agora
          </Button>
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/60"><Lock className="h-3 w-3" /><span className="text-[11px]">Criptografado</span></div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground/60"><Shield className="h-3 w-3" /><span className="text-[11px]">Pagamento seguro</span></div>
          </div>
        </div>
      );
    }

    const renderPrice = () => {
      if (onlineDiscountPercent > 0 && originalAmountCents) {
        return (
          <div className="text-right">
            <span className="text-sm text-muted-foreground line-through mr-2">R$ {(originalAmountCents / 100).toFixed(2)}</span>
            <span className="font-semibold text-emerald-500">R$ {amount.toFixed(2)}</span>
            <p className="text-xs text-emerald-500">{onlineDiscountPercent}% de desconto online</p>
          </div>
        );
      }
      return <span className="font-semibold text-primary">R$ {amount.toFixed(2)}</span>;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
          <span className="text-sm text-muted-foreground">{serviceName}</span>
          {renderPrice()}
        </div>
        <p className="text-center text-sm text-muted-foreground">Escolha a forma de pagamento:</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleSelectPaymentMethod('card')} className="flex flex-col items-center gap-2 p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary/80 hover:border-primary/50 transition-all">
            <CreditCard className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">Cartão de Crédito</span>
            <span className="text-xs text-muted-foreground">À vista</span>
          </button>
          <button onClick={() => handleSelectPaymentMethod('pix')} className="flex flex-col items-center gap-2 p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary/80 hover:border-primary/50 transition-all">
            <QrCode className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">PIX</span>
            <span className="text-xs text-muted-foreground">Instantâneo</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground/60"><Lock className="h-3 w-3" /><span className="text-[11px]">Criptografado</span></div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground/60"><Shield className="h-3 w-3" /><span className="text-[11px]">Pagamento seguro</span></div>
        </div>
      </div>
    );
  }

  // PIX waiting state
  if (status === 'pix-waiting' && pixData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{serviceName}</span>
          </div>
          {onlineDiscountPercent > 0 && originalAmountCents ? (
            <div className="text-right">
              <span className="text-sm text-muted-foreground line-through mr-2">R$ {(originalAmountCents / 100).toFixed(2)}</span>
              <span className="font-semibold text-emerald-500">R$ {amount.toFixed(2)}</span>
            </div>
          ) : (
            <span className="font-semibold text-primary">R$ {amount.toFixed(2)}</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium mb-4">Escaneie o QR Code ou copie o código PIX:</p>
          {pixData.qr_code_base64 && (
            <div className="inline-block p-4 bg-white rounded-xl mb-4">
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48" />
            </div>
          )}
          <Button onClick={copyPixCode} variant="outline" className="w-full gap-2">
            {copied ? (<><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Código copiado!</>) : (<><Copy className="h-4 w-4" /> Copiar código PIX</>)}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Após o pagamento, a confirmação pode levar alguns segundos.</p>
        </div>
        <Button onClick={goBackToMethodSelect} variant="ghost" className="w-full">Voltar e escolher outra forma de pagamento</Button>
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground/60"><Lock className="h-3 w-3" /><span className="text-[11px]">Criptografado</span></div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground/60"><Shield className="h-3 w-3" /><span className="text-[11px]">Pagamento seguro</span></div>
        </div>
      </div>
    );
  }

  // PIX processing state
  if (status === 'processing' && paymentMethod === 'pix') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="relative">
          <div className="w-48 h-48 bg-muted rounded-lg animate-pulse flex items-center justify-center">
            <QrCode className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Gerando QR Code PIX...</p>
          <p className="text-xs text-muted-foreground">Aguarde um momento</p>
        </div>
        <div className="w-full max-w-sm space-y-2">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-9 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Card form state
  if (status === 'card-form' || status === 'ready' || (status === 'processing' && paymentMethod === 'card')) {
    const addressComplete = isBillingAddressComplete(billingAddress);

    const handleContinueToCard = () => {
      setCheckoutStep('card');
      setTimeout(() => {
        cardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };

    return (
      <div className="space-y-4">
        {/* Payment info with discount */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{serviceName}</span>
          </div>
          {onlineDiscountPercent > 0 && originalAmountCents ? (
            <div className="text-right">
              <span className="text-sm text-muted-foreground line-through mr-2">R$ {(originalAmountCents / 100).toFixed(2)}</span>
              <span className="font-semibold text-emerald-500">R$ {amount.toFixed(2)}</span>
              <p className="text-xs text-emerald-500">{onlineDiscountPercent}% off online</p>
            </div>
          ) : (
            <span className="font-semibold text-primary">R$ {amount.toFixed(2)}</span>
          )}
        </div>

        {/* Mini stepper */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${checkoutStep === 'address' ? 'text-primary' : 'text-emerald-500'}`}>
            <div className={`w-2 h-2 rounded-full ${checkoutStep === 'address' ? 'bg-primary' : 'bg-emerald-500'}`} />
            <span className="text-xs font-medium">Endereço</span>
          </div>
          <div className={`flex-1 h-px ${checkoutStep === 'card' ? 'bg-emerald-500' : 'bg-border'}`} />
          <div className={`flex items-center gap-1.5 ${checkoutStep === 'card' ? 'text-primary' : 'text-muted-foreground/50'}`}>
            <div className={`w-2 h-2 rounded-full ${checkoutStep === 'card' ? 'bg-primary' : 'bg-border'}`} />
            <span className="text-xs font-medium">Pagamento</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {errorMessage}
            </p>
          </div>
        )}

        {/* Loading indicator while brick is initializing */}
        {status === 'card-form' && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Carregando formulário...</p>
          </div>
        )}

        {/* Step 1: Billing Address */}
        {checkoutStep === 'address' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</div>
              <h3 className="text-sm font-semibold uppercase tracking-wide">Endereço de Cobrança</h3>
            </div>
            <p className="text-xs text-muted-foreground">Informe o endereço vinculado ao seu cartão de crédito.</p>
            <BillingAddressForm value={billingAddress} onChange={setBillingAddress} />
            <Button
              onClick={handleContinueToCard}
              disabled={!addressComplete}
              className="w-full h-12 rounded-xl font-medium gap-2"
            >
              Continuar para pagamento <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                <Check className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço de Cobrança</h3>
            </div>
            <div className="bg-secondary/50 border border-border rounded-lg p-3 flex justify-between items-center">
              <div className="text-sm">
                <p className="text-foreground">{billingAddress.street_name}, {billingAddress.street_number}</p>
                <p className="text-muted-foreground text-xs">{billingAddress.neighborhood} · {billingAddress.city}/{billingAddress.federal_unit} · {formatCep(billingAddress.zip_code)}</p>
              </div>
              <button
                onClick={() => setCheckoutStep('address')}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <Pencil className="h-3 w-3" /> Editar
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Card data */}
        <div ref={cardSectionRef}>
          {checkoutStep === 'card' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</div>
                <h3 className="text-sm font-semibold uppercase tracking-wide">Dados do Cartão</h3>
              </div>
            </div>
          ) : (
            <div className="space-y-2 opacity-40 pointer-events-none select-none">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">2</div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do Cartão</h3>
              </div>
              <p className="text-xs text-muted-foreground">🔒 Preencha o endereço acima para liberar o pagamento.</p>
            </div>
          )}

          {/* Brick container — always in DOM, visibility controlled */}
          <div
            id="cardPaymentBrick_container"
            className={`mp-checkout-container ${checkoutStep !== 'card' ? 'h-0 overflow-hidden opacity-0 pointer-events-none' : 'mt-4'}`}
          />

          {checkoutStep === 'card' && (
            <>
              {/* Turnstile */}
              <TurnstileWidget
                key={turnstileKey}
                onVerify={(token) => {
                  console.log('[TURNSTILE] Token received');
                  setTurnstileToken(token);
                }}
                onExpire={() => {
                  console.log('[TURNSTILE] Token expired');
                  setTurnstileToken(null);
                }}
                onError={() => {
                  console.log('[TURNSTILE] Error');
                  setTurnstileToken(null);
                }}
              />

              <Button onClick={goBackToMethodSelect} variant="ghost" className="w-full">Voltar e escolher outra forma de pagamento</Button>
            </>
          )}
        </div>

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
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground/60"><Lock className="h-3 w-3" /><span className="text-[11px]">Criptografado</span></div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground/60"><Shield className="h-3 w-3" /><span className="text-[11px]">Pagamento seguro</span></div>
        </div>

        {/* Terms & Privacy */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground/50">
          <a href="/legal/termos-de-uso" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">Termos</a>
          <span>·</span>
          <a href="/legal/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">Privacidade</a>
        </div>
      </div>
    );
  }

  return null;
};
