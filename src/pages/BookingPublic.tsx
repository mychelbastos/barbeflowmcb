import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Scissors, 
  Star, 
  MapPin, 
  Phone, 
  Mail,
  User,
  CheckCircle
} from "lucide-react";

const BookingPublic = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Mock data
  const barbershop = {
    name: "Barbearia Premium",
    slug: "barbearia-premium",
    rating: 4.8,
    reviews: 127,
    address: "Rua das Flores, 123 - Centro",
    phone: "(11) 99999-9999",
    image: "/api/placeholder/800/400"
  };

  const services = [
    { 
      id: 1, 
      name: "Corte Tradicional", 
      duration: 30, 
      price: 25, 
      description: "Corte clássico com acabamento tradicional"
    },
    { 
      id: 2, 
      name: "Corte + Barba", 
      duration: 45, 
      price: 40, 
      description: "Corte completo com barba aparada"
    },
    { 
      id: 3, 
      name: "Barba", 
      duration: 20, 
      price: 20, 
      description: "Aparar e modelar barba"
    },
    { 
      id: 4, 
      name: "Corte Premium", 
      duration: 60, 
      price: 55, 
      description: "Corte premium com hidratação e massagem"
    }
  ];

  const staff = [
    { 
      id: 1, 
      name: "Carlos Silva", 
      specialty: "Cortes clássicos", 
      rating: 4.9,
      image: "/api/placeholder/100/100"
    },
    { 
      id: 2, 
      name: "Roberto Santos", 
      specialty: "Barbas e bigodes", 
      rating: 4.8,
      image: "/api/placeholder/100/100"
    },
    { 
      id: 3, 
      name: "Maria Costa", 
      specialty: "Cortes femininos", 
      rating: 5.0,
      image: "/api/placeholder/100/100"
    }
  ];

  const availableTimes = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
  ];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId);
    setStep(3);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(5);
  };

  if (step === 5) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-success/20 shadow-large">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-muted-foreground mb-6">
              Seu horário foi reservado com sucesso. Você receberá uma confirmação por WhatsApp.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-medium">Corte + Barba</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-medium">Carlos Silva</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">Hoje, 15:30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium text-accent">R$ 40,00</span>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="hero">
              Adicionar ao Calendário
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative h-64 bg-gradient-primary overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8">
          <div className="text-primary-foreground">
            <h1 className="text-3xl font-bold mb-2">{barbershop.name}</h1>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1 fill-current" />
                {barbershop.rating} ({barbershop.reviews} avaliações)
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {barbershop.address}
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                {barbershop.phone}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i}
                </div>
                {i < 4 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step > i ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escolha seu serviço
              </h2>
              <p className="text-muted-foreground">
                Selecione o serviço que deseja agendar
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {services.map((service) => (
                <Card 
                  key={service.id} 
                  className="cursor-pointer border-border hover:border-primary hover:shadow-medium transition-all duration-300"
                  onClick={() => handleServiceSelect(service.id.toString())}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Scissors className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-accent font-semibold">
                        R$ {service.price}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{service.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {service.duration} minutos
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escolha o profissional
              </h2>
              <p className="text-muted-foreground">
                Selecione quem você prefere que faça o atendimento
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Card className="mb-6 border-accent/20 bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => handleStaffSelect("any")}
                      className="border-accent/20 hover:bg-accent/10"
                    >
                      Qualquer profissional disponível
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Separator className="mb-6" />
              
              <div className="space-y-4">
                {staff.map((member) => (
                  <Card 
                    key={member.id}
                    className="cursor-pointer border-border hover:border-primary hover:shadow-medium transition-all duration-300"
                    onClick={() => handleStaffSelect(member.id.toString())}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{member.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{member.specialty}</p>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-accent fill-current mr-1" />
                            <span className="text-sm font-medium">{member.rating}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === 3 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escolha data e horário
              </h2>
              <p className="text-muted-foreground">
                Selecione o melhor horário para você
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Hoje - 15 de Janeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        onClick={() => handleTimeSelect(time)}
                        className="h-12 hover:border-primary hover:bg-primary/5"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4: Contact Information */}
        {step === 4 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Seus dados de contato
              </h2>
              <p className="text-muted-foreground">
                Precisamos dessas informações para confirmar seu agendamento
              </p>
            </div>
            
            <div className="max-w-xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        required
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        required
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enviaremos a confirmação por WhatsApp
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail (opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações (opcional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Alguma observação especial?"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo do agendamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serviço:</span>
                        <span className="font-medium">Corte + Barba</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profissional:</span>
                        <span className="font-medium">Carlos Silva</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data e hora:</span>
                        <span className="font-medium">Hoje, 15:30</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-accent">R$ 40,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full" variant="hero">
                  Confirmar Agendamento
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPublic;