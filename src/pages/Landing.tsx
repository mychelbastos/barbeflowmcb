import { Button } from "@/components/ui/button";
import { Scissors, Calendar, Users, Clock, Shield, Smartphone, CreditCard, ArrowRight, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <Scissors className="h-4 w-4 text-zinc-950" />
              </div>
              <span className="text-lg font-semibold tracking-tight">BarberSync</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/app/login">
                <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50">
                  Entrar
                </Button>
              </Link>
              <Link to="/app/register">
                <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Sistema de Agendamento Profissional
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Transforme sua barbearia em um{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-500">
              negócio digital
            </span>
          </h1>
          
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistema completo de agendamento online. Seus clientes agendam sem cadastro, 
            você gerencia tudo em um só lugar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/app/register">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-12 px-8 text-base">
                <Calendar className="mr-2 h-5 w-5" />
                Começar Agora — Grátis
              </Button>
            </Link>
            <Link to="#demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 h-12 px-8 text-base text-zinc-300">
                Ver Demonstração
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Recursos profissionais para gerenciar agendamentos, clientes e aumentar sua receita
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Calendar,
                title: "Agendamento Online",
                description: "Clientes agendam 24/7 sem precisar criar conta",
                color: "emerald"
              },
              {
                icon: Users,
                title: "Gestão de Equipe",
                description: "Cadastre profissionais e defina horários individuais",
                color: "blue"
              },
              {
                icon: Smartphone,
                title: "Notificações",
                description: "Confirmações e lembretes automáticos via WhatsApp",
                color: "violet"
              },
              {
                icon: CreditCard,
                title: "Pagamentos",
                description: "Receba antecipado e reduza faltas em até 60%",
                color: "amber"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  feature.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                  feature.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                  feature.color === 'violet' ? 'bg-violet-500/10 text-violet-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-zinc-100">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                Para Barbearias
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">
                Aumente sua receita em até{" "}
                <span className="text-emerald-400">40%</span>
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    icon: Clock,
                    title: "Reduza faltas em 60%",
                    description: "Lembretes automáticos e sistema de confirmação reduzem drasticamente as faltas"
                  },
                  {
                    icon: Sparkles,
                    title: "Melhore a experiência",
                    description: "Seus clientes agendam de forma rápida e prática, sem complicações"
                  },
                  {
                    icon: Shield,
                    title: "Controle total",
                    description: "Dashboard completo com relatórios, métricas e gestão de toda operação"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-zinc-100">{item.title}</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50" />
              <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
                <div className="space-y-4">
                  {[
                    { label: "Agendamentos hoje", value: "24", trend: "+12%" },
                    { label: "Receita do mês", value: "R$ 12.450", trend: "+23%" },
                    { label: "Clientes ativos", value: "186", trend: "+8%" }
                  ].map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50">
                      <div>
                        <p className="text-zinc-500 text-sm">{stat.label}</p>
                        <p className="text-xl font-semibold text-zinc-100">{stat.value}</p>
                      </div>
                      <span className="text-emerald-400 text-sm font-medium">{stat.trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simples e transparente
          </h2>
          <p className="text-zinc-400 text-lg mb-12">
            Comece gratuitamente, escale quando precisar
          </p>
          
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 p-8 sm:p-10">
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-5xl font-bold text-zinc-100">R$ 0</span>
              <span className="text-zinc-500">/ mês</span>
            </div>
            
            <p className="text-zinc-400 mb-8">
              Primeiros 30 dias grátis. Depois, a partir de R$ 49/mês.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-3 text-left mb-8">
              {[
                "Agendamentos ilimitados",
                "Até 5 profissionais",
                "Página de agendamento",
                "Notificações WhatsApp",
                "Dashboard de gestão",
                "Suporte prioritário"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-zinc-300">
                  <Check className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            
            <Link to="/app/register">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-12 px-10 text-base">
                Começar Gratuitamente
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Pronto para modernizar sua barbearia?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Configure em 5 minutos. Sem compromisso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/app/register">
              <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold h-12 px-8 text-base">
                <Scissors className="mr-2 h-5 w-5" />
                Criar Minha Barbearia
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 h-12 px-8 text-base text-zinc-300">
              Falar com Especialista
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-md flex items-center justify-center">
              <Scissors className="h-3 w-3 text-zinc-950" />
            </div>
            <span className="font-semibold">BarberSync</span>
          </div>
          <p className="text-zinc-600 text-sm">
            © 2024 BarberSync. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
