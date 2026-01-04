import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useIsMobile } from "@/hooks/use-mobile";
import { TenantSelector } from "@/components/TenantSelector";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  Calendar, 
  Plus, 
  Users, 
  Scissors, 
  Home, 
  FileText, 
  Wallet, 
  Settings, 
  Menu,
  User,
  LogOut,
  ChevronRight,
  MessageCircle
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBookingModal } from "@/hooks/useBookingModal";
import { BookingModal } from "@/components/modals/BookingModal";

const navigationItems = [
  { title: "Dashboard", url: "/app/dashboard", icon: Home },
  { title: "Calendário", url: "/app/agenda", icon: Calendar },
  { title: "Agendamentos", url: "/app/bookings", icon: FileText },
  { title: "Serviços", url: "/app/services", icon: Scissors },
  { title: "Profissionais", url: "/app/staff", icon: Users },
  { title: "Clientes", url: "/app/customers", icon: User },
  { title: "Financeiro", url: "/app/finance", icon: Wallet },
  { title: "WhatsApp", url: "/app/whatsapp", icon: MessageCircle },
  { title: "Configurações", url: "/app/settings", icon: Settings },
];

const bottomTabItems = [
  { title: "Home", url: "/app/dashboard", icon: Home },
  { title: "Calendário", url: "/app/agenda", icon: Calendar },
  { title: "Financeiro", url: "/app/finance", icon: Wallet },
  { title: "Mais", url: "/app/settings", icon: Menu },
];

function AppSidebar() {
  const { currentTenant } = useTenant();
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-zinc-800/50 bg-zinc-950">
      <SidebarHeader className="p-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
            <Scissors className="h-4 w-4 text-zinc-950" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-zinc-100 truncate">
              {currentTenant?.name || 'BarberSync'}
            </h1>
            <p className="text-xs text-zinc-500">
              {currentTenant?.slug ? `@${currentTenant.slug}` : 'Dashboard'}
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{item.title}</span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-zinc-800/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-zinc-800/50">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-zinc-100">
                  {user?.user_metadata?.name || 'Usuário'}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {user?.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem onClick={signOut} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-zinc-900 border-zinc-800">
        <DrawerHeader className="border-b border-zinc-800/50">
          <DrawerTitle className="text-zinc-100">Menu</DrawerTitle>
          <DrawerDescription className="text-zinc-500">
            Navegue pelas funcionalidades do sistema
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50 safe-area-pb">
      <div className="grid grid-cols-4">
        {bottomTabItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive 
                  ? 'text-emerald-400' 
                  : 'text-zinc-500'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FloatingActionButton() {
  const { openBookingModal } = useBookingModal();

  return (
    <Button
      onClick={openBookingModal}
      size="lg"
      className="md:hidden fixed bottom-20 right-4 rounded-full w-14 h-14 shadow-lg z-50 bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}

export default function AppShell() {
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { currentTenant } = useTenant();
  const { openBookingModal } = useBookingModal();

  if (isMobile) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-3">
                <MobileDrawer />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Scissors className="h-3.5 w-3.5 text-zinc-950" />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-zinc-100">
                      {currentTenant?.name || 'BarberSync'}
                    </h1>
                  </div>
                  <TenantSelector />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">
                  {format(new Date(), "dd/MM", { locale: ptBR })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-zinc-800/50">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem onClick={signOut} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile Content */}
          <main className="pb-24 bg-zinc-950">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation */}
          <BottomTabs />
          <FloatingActionButton />
        </div>
        
        {/* Global Booking Modal */}
        <BookingModal />
      </>
    );
  }

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-zinc-950">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Desktop Header */}
            <header className="sticky top-0 z-40 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
              <div className="flex items-center justify-between px-6 h-14">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-zinc-400 hover:text-zinc-100" />
                  <TenantSelector />
                  <div className="text-sm text-zinc-500">
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    size="sm" 
                    onClick={openBookingModal}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Agendamento
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-zinc-800/50">
                        <Avatar className="h-7 w-7 mr-2">
                          <AvatarImage src={user?.user_metadata?.avatar_url} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                            {user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline text-zinc-300">
                          {user?.user_metadata?.name || 'Usuário'}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                      <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                        <User className="h-4 w-4 mr-2" />
                        Perfil
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem onClick={signOut} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* Desktop Content */}
            <main className="flex-1 p-6 bg-zinc-950">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      {/* Global Booking Modal */}
      <BookingModal />
    </>
  );
}
