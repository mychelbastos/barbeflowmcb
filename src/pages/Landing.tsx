import { Button } from "@/components/ui/button";
import { Scissors, Calendar, Users, Clock, Shield, Smartphone, CreditCard, ArrowRight, Check, Sparkles, BarChart3, Zap, Star, ChevronRight, Play, TrendingUp, MessageCircle, LayoutDashboard } from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { getDashboardUrl } from "@/lib/hostname";
import { useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import mobileMockup from "@/assets/mobile-mockup.png";

const Landing = () => {
  const heroRef = useRef(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div className="min-h-screen bg-[hsl(240,6%,4%)] text-zinc-100 overflow-x-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-4 mt-4">
          <div className="max-w-6xl mx-auto bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/40 rounded-2xl px-6">
            <div className="flex justify-between items-center h-14">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Scissors className="h-4 w-4 text-zinc-950" />
                </div>
                <span className="text-lg font-bold tracking-tight">BarberFlow</span>
              </div>
              <div className="hidden md:flex items-center gap-8">
                {["Recursos", "Preços", "Depoimentos"].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors duration-200">
                    {item}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {isLoggedIn ? (
                  <a href={getDashboardUrl('/app/dashboard')}>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl shadow-lg shadow-emerald-500/20">
                      <LayoutDashboard className="h-4 w-4 mr-1.5" />
                      Meu Painel
                    </Button>
                  </a>
                ) : (
                  <>
                    <a href={getDashboardUrl('/app/login')}>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                        Entrar
                      </Button>
                    </a>
                    <a href={getDashboardUrl('/app/register')}>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl shadow-lg shadow-emerald-500/20">
                        Começar Grátis
                      </Button>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-36 pb-8 px-6">
        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8 backdrop-blur-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>O sistema #1 para barbearias modernas</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            Sua barbearia no
            <br />
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500">
                próximo nível
              </span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 1, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-2 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400/60 to-transparent origin-left rounded-full"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Agendamento online, gestão financeira e notificações automáticas.
            Tudo em uma plataforma intuitiva e elegante.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
          >
            {isLoggedIn ? (
              <a href={getDashboardUrl('/app/dashboard')}>
                <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-13 px-8 text-base rounded-xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02]">
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  Ir ao Dashboard
                </Button>
              </a>
            ) : (
              <>
                <a href={getDashboardUrl('/app/register')}>
                  <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-13 px-8 text-base rounded-xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02]">
                    <Zap className="mr-2 h-5 w-5" />
                    Começar Agora — Grátis
                  </Button>
                </a>
                <a href="#demo">
                  <Button size="lg" variant="ghost" className="w-full sm:w-auto bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 h-13 px-8 text-base text-zinc-100 rounded-xl backdrop-blur-sm">
                    <Play className="mr-2 h-4 w-4" />
                    Ver Demonstração
                  </Button>
                </a>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex items-center justify-center gap-6 text-sm text-zinc-500"
          >
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" /> Grátis por 30 dias
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" /> Sem cartão de crédito
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" /> Setup em 5 min
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* Hero Dashboard Mockup */}
      <section className="px-6 pb-24 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent rounded-3xl blur-2xl" />
          <div className="relative rounded-2xl border border-zinc-800/60 overflow-hidden shadow-2xl shadow-black/50">
            <div className="bg-zinc-900/80 backdrop-blur-xl px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-zinc-800/80 rounded-lg px-4 py-1 text-xs text-zinc-500 font-mono">
                  app.barberflow.com.br/dashboard
                </div>
              </div>
            </div>
            <img src={dashboardMockup} alt="BarberFlow Dashboard" className="w-full" />
          </div>
        </motion.div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 px-6 border-y border-zinc-800/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-col md:flex-row items-center justify-between gap-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">+500 barbearias confiam no BarberFlow</p>
              </div>
            </div>
            <div className="flex items-center gap-12 text-center">
              {[
                { value: "98%", label: "Satisfação" },
                { value: "50k+", label: "Agendamentos/mês" },
                { value: "-60%", label: "Menos faltas" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 text-xs font-medium mb-6 uppercase tracking-wider"
            >
              Recursos
            </motion.div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5">
              Tudo que você precisa,
              <br />
              <span className="text-zinc-400">nada que você não precisa</span>
            </h2>
            <p className="text-zinc-500 text-lg max-w-xl mx-auto">
              Ferramentas profissionais construídas para o dia a dia da sua barbearia
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Calendar, title: "Agendamento Online 24/7", description: "Seus clientes agendam a qualquer hora, sem criar conta. Link exclusivo da sua barbearia.", accent: "emerald" },
              { icon: Users, title: "Gestão de Equipe", description: "Cadastre profissionais, defina horários individuais e acompanhe a performance de cada um.", accent: "blue" },
              { icon: MessageCircle, title: "WhatsApp Automático", description: "Confirmações, lembretes e notificações enviadas automaticamente via WhatsApp.", accent: "green" },
              { icon: CreditCard, title: "Pagamento Antecipado", description: "Integração com Mercado Pago. Reduza faltas com cobrança no agendamento.", accent: "violet" },
              { icon: BarChart3, title: "Dashboard Financeiro", description: "Receita, comissões e métricas em tempo real. Gráficos interativos e relatórios.", accent: "amber" },
              { icon: Zap, title: "Pacotes & Assinaturas", description: "Crie pacotes de serviços e planos recorrentes para fidelizar seus clientes.", accent: "rose" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 hover:border-zinc-700/60 transition-all duration-300 hover:bg-zinc-900/60"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                    feature.accent === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                    feature.accent === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                    feature.accent === 'green' ? 'bg-green-500/10 text-green-400' :
                    feature.accent === 'violet' ? 'bg-violet-500/10 text-violet-400' :
                    feature.accent === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-zinc-100">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section - Dashboard + Mobile */}
      <section id="demo" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6 uppercase tracking-wider">
                Para sua Barbearia
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 leading-tight">
                Aumente sua receita em até{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">40%</span>
              </h2>
              <p className="text-zinc-400 mb-10 leading-relaxed">
                Reduza faltas, automatize sua operação e ofereça a melhor experiência aos seus clientes.
              </p>

              <div className="space-y-5">
                {[
                  { icon: TrendingUp, title: "Reduza faltas em 60%", description: "Lembretes automáticos e confirmação reduzem no-shows" },
                  { icon: Sparkles, title: "Experiência premium", description: "Agendamento rápido e prático pelo celular" },
                  { icon: Shield, title: "Controle total", description: "Dashboard com métricas, relatórios e gestão completa" }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/30 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 mb-0.5">{item.title}</h3>
                      <p className="text-zinc-500 text-sm">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex justify-center"
            >
              <div className="absolute -inset-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10 rounded-3xl blur-3xl opacity-50" />
              <div className="relative">
                <img src={mobileMockup} alt="BarberFlow Mobile" className="w-64 rounded-[2rem] shadow-2xl shadow-black/60 border border-zinc-800/50" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -20 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="absolute -left-16 top-1/4 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4 shadow-xl shadow-black/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Novo agendamento</p>
                      <p className="text-sm font-semibold text-zinc-100">João • 14:30</p>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="absolute -right-12 bottom-1/3 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4 shadow-xl shadow-black/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Confirmado</p>
                      <p className="text-sm font-semibold text-emerald-400">R$ 45,00</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-28 px-6 border-t border-zinc-800/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 text-xs font-medium mb-6 uppercase tracking-wider">
              Depoimentos
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Quem usa, <span className="text-emerald-400">recomenda</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Carlos Mendes", role: "Barbearia Premium", quote: "Depois do BarberFlow, minhas faltas caíram pela metade. Os clientes adoram agendar pelo celular." },
              { name: "Rafael Costa", role: "Studio RC Barber", quote: "O dashboard financeiro me deu uma visão que eu nunca tive. Consegui aumentar minha receita em 35%." },
              { name: "André Silva", role: "Barber House", quote: "Setup em 10 minutos e já estava funcionando. O WhatsApp automático economiza horas do meu dia." },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 hover:border-zinc-700/50 transition-all duration-300"
              >
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{testimonial.name}</p>
                    <p className="text-xs text-zinc-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="preços" className="py-28 px-6 border-t border-zinc-800/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 text-xs font-medium mb-6 uppercase tracking-wider">
              Preços
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Simples. Transparente.
            </h2>
            <p className="text-zinc-500 text-lg">Comece grátis, escale quando precisar</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Monthly */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/40"
            >
              <p className="text-sm font-medium text-zinc-400 mb-2">Mensal</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-zinc-100">Em breve</span>
              </div>
              <p className="text-zinc-500 text-sm mb-8">Flexibilidade total, sem fidelidade</p>
              <ul className="space-y-3 mb-8">
                {["Agendamentos ilimitados", "Profissionais ilimitados", "WhatsApp automático", "Pagamento online", "Dashboard completo", "Suporte prioritário"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href={getDashboardUrl('/app/register')}>
                <Button variant="outline" className="w-full rounded-xl h-11 border-zinc-700/50 text-zinc-100 hover:bg-zinc-800">
                  Começar Grátis
                </Button>
              </a>
            </motion.div>

            {/* Annual */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative p-8 rounded-2xl bg-zinc-900/60 border border-emerald-500/30 shadow-xl shadow-emerald-500/5"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-zinc-950 text-xs font-bold">
                  Melhor valor
                </span>
              </div>
              <p className="text-sm font-medium text-emerald-400 mb-2">Anual</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-zinc-100">Em breve</span>
              </div>
              <p className="text-zinc-500 text-sm mb-8">Economize com o plano anual</p>
              <ul className="space-y-3 mb-8">
                {["Tudo do plano mensal", "Desconto exclusivo anual", "Onboarding personalizado", "Prioridade em novos recursos"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href={getDashboardUrl('/app/register')}>
                <Button className="w-full rounded-xl h-11 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-lg shadow-emerald-500/20">
                  Começar Grátis
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/[0.04] to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <div className="absolute -inset-20 bg-emerald-500/[0.03] rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-5 leading-tight">
              Pronto para transformar
              <br />
              sua barbearia?
            </h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-lg mx-auto">
              Configure em 5 minutos. Sem cartão de crédito. Cancele quando quiser.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={getDashboardUrl('/app/register')}>
                <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold h-13 px-10 text-base rounded-xl shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02]">
                  <Scissors className="mr-2 h-5 w-5" />
                  Criar Minha Barbearia
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800/30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <Scissors className="h-3 w-3 text-zinc-950" />
            </div>
            <span className="font-bold text-sm">BarberFlow</span>
          </div>
          <p className="text-zinc-600 text-xs">
            © 2025 BarberFlow. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
