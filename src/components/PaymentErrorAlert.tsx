import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';

export interface PaymentError {
  message: string;
  action: string;
  severity: 'retry' | 'contact' | 'fatal';
}

export interface PaymentPending {
  message: string;
  action: string;
}

interface PaymentErrorAlertProps {
  error: PaymentError | null;
  pending: PaymentPending | null;
}

export function PaymentErrorAlert({ error, pending }: PaymentErrorAlertProps) {
  if (pending) {
    return (
      <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm text-blue-400">{pending.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{pending.action}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!error) return null;

  const isRetry = error.severity === 'retry';

  return (
    <div className={`rounded-xl p-4 ${
      isRetry
        ? 'bg-amber-500/10 border border-amber-500/20'
        : 'bg-destructive/10 border border-destructive/20'
    }`}>
      <div className="flex items-start gap-3">
        {isRetry ? (
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
        )}
        <div>
          <p className={`font-medium text-sm ${isRetry ? 'text-amber-400' : 'text-destructive'}`}>
            {error.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{error.action}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Parse backend payment result into PaymentError/PaymentPending.
 * Works for both mp-process-payment and mp-create-subscription responses.
 */
export function parsePaymentResult(data: any): {
  error: PaymentError | null;
  pending: PaymentPending | null;
} {
  if (!data) return { error: null, pending: null };

  // Rejected
  if (data.status === 'rejected' || (data.success === false && data.error)) {
    return {
      error: {
        message: data.error || 'Pagamento recusado.',
        action: data.error_action || 'Verifique os dados do cartão e tente novamente.',
        severity: data.error_severity || 'retry',
      },
      pending: null,
    };
  }

  // Pending
  if (data.status === 'pending' || data.status === 'in_process') {
    return {
      error: null,
      pending: {
        message: data.pending_message || 'Pagamento em processamento.',
        action: data.pending_action || 'Aguarde a confirmação.',
      },
    };
  }

  // Generic error field
  if (data.error && data.status !== 'approved') {
    return {
      error: {
        message: data.error,
        action: data.error_action || 'Tente novamente.',
        severity: data.error_severity || 'retry',
      },
      pending: null,
    };
  }

  return { error: null, pending: null };
}
