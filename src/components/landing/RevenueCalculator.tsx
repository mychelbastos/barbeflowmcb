import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CurrencyInput } from "@/components/ui/currency-input";
import { getDashboardUrl } from "@/lib/hostname";
import { Calculator, TrendingUp, Zap } from "lucide-react";

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(prevValue.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        node.textContent = v.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
        });
      },
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  return <span ref={ref} />;
}

export default function RevenueCalculator() {
  const [clients, setClients] = useState(30);
  const [planValue, setPlanValue] = useState("80.00");
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const revenue = clients * parseFloat(planValue || "0");
  const annualRevenue = revenue * 12;

  return (
    <section ref={sectionRef} className="py-20 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.03] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl mx-auto relative"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-5 uppercase tracking-wider">
            <Calculator className="h-3.5 w-3.5" />
            Calculadora da Liberdade
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Quanto você pode <span className="text-primary">garantir</span> por mês?
          </h2>
          <p className="text-zinc-500 text-base max-w-lg mx-auto">
            Simule agora quanto entraria na sua conta antes mesmo de ligar a máquina
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-zinc-900/60 border border-primary/20 backdrop-blur-sm shadow-2xl shadow-primary/5">
          <div className="grid sm:grid-cols-2 gap-8 mb-8">
            {/* Clients slider */}
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-3 block">
                Quantos clientes fiéis você tem hoje?
              </label>
              <div className="flex items-center gap-4 mb-2">
                <Slider
                  value={[clients]}
                  onValueChange={([v]) => setClients(v)}
                  min={5}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-2xl font-bold text-primary tabular-nums w-12 text-right">
                  {clients}
                </span>
              </div>
              <p className="text-xs text-zinc-600">de 5 a 100 clientes</p>
            </div>

            {/* Plan value */}
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-3 block">
                Valor do plano mensal?
              </label>
              <CurrencyInput
                value={planValue}
                onChange={setPlanValue}
                className="bg-zinc-800/60 border-zinc-700/50 text-lg font-semibold h-12"
              />
              <p className="text-xs text-zinc-600 mt-2">ex: Corte + Barba ilimitados</p>
            </div>
          </div>

          {/* Result */}
          <motion.div
            key={revenue}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-6 px-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
          >
            <p className="text-sm text-zinc-400 mb-2">Você pode começar o mês com</p>
            <p className="text-4xl sm:text-5xl font-bold text-primary mb-1">
              <AnimatedNumber value={revenue} />
            </p>
            <p className="text-lg font-semibold text-primary/80 uppercase tracking-wider">
              Garantidos na conta
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-zinc-500">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>
                Projeção anual:{" "}
                <span className="text-emerald-400 font-semibold">
                  {annualRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </span>
            </div>
          </motion.div>

          <div className="mt-6 text-center">
            <a href={getDashboardUrl("/app/register")}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold h-13 px-10 text-base rounded-xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02]"
              >
                <Zap className="mr-2 h-5 w-5" />
                Começar a Faturar Agora
              </Button>
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
