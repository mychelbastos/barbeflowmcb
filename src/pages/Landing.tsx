import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scissors, Calendar, Users, Star, Clock, Shield, Smartphone, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/barbershop-hero.jpg";
import appMockup from "@/assets/app-mockup.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Scissors className="h-8 w-8 text-accent mr-2" />
              <span className="text-xl font-bold text-foreground">BarberSync</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/app/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/app/register">
                <Button variant="hero">Começar Grátis</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Interior moderno de barbearia profissional" 
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              Sistema de Agendamento Profissional
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Transforme sua <span className="text-accent">barbearia</span><br />
              em um negócio digital
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Sistema completo de agendamento online para barbearias. 
              Seus clientes agendam sem cadastro, você gerencia tudo em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/app/register">
                  <Calendar className="mr-2 h-5 w-5" />
                  Começar Agora - Grátis
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="#demo">
                  Ver Demonstração
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Recursos profissionais para gerenciar agendamentos, clientes e aumentar sua receita
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-6 border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Agendamento Online
              </h3>
              <p className="text-muted-foreground text-sm">
                Clientes agendam 24/7 sem precisar criar conta. Apenas nome e WhatsApp.
              </p>
            </Card>

            <Card className="p-6 border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Gestão de Equipe
              </h3>
              <p className="text-muted-foreground text-sm">
                Cadastre profissionais, defina horários e acompanhe a performance.
              </p>
            </Card>

            <Card className="p-6 border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Notificações WhatsApp
              </h3>
              <p className="text-muted-foreground text-sm">
                Confirmações e lembretes automáticos via WhatsApp e e-mail.
              </p>
            </Card>

            <Card className="p-6 border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-warning" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Pagamentos Online
              </h3>
              <p className="text-muted-foreground text-sm">
                Receba antecipado com integração Pagar.me. Reduza faltas.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                Para Barbearias
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Aumente sua receita em até 40%
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Clock className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Reduza faltas em 60%
                    </h3>
                    <p className="text-muted-foreground">
                      Lembretes automáticos e sistema de confirmação reduzem drasticamente as faltas.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Star className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Melhore a experiência
                    </h3>
                    <p className="text-muted-foreground">
                      Seus clientes agendam de forma rápida e prática, sem complicações.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Controle total
                    </h3>
                    <p className="text-muted-foreground">
                      Dashboard completo com relatórios, métricas e gestão de toda a operação.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-accent rounded-3xl opacity-10 blur-xl" />
              <div className="relative bg-background rounded-2xl shadow-large overflow-hidden border border-border">
                <img 
                  src={appMockup} 
                  alt="Interface do sistema de agendamento BarberSync" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para modernizar sua barbearia?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Configure em 5 minutos. Primeiros 30 dias grátis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="accent" size="xl" asChild>
              <Link to="/app/register">
                <Scissors className="mr-2 h-5 w-5" />
                Criar Minha Barbearia
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Falar com Especialista
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Scissors className="h-6 w-6 text-accent mr-2" />
              <span className="text-lg font-bold text-foreground">BarberSync</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 BarberSync. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;