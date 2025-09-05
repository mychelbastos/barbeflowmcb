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
  SidebarGroupLabel,
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
  LogOut
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
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Scissors className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-sidebar-foreground truncate">
              {currentTenant?.name || 'BarberSync'}
            </h1>
            <p className="text-xs text-sidebar-foreground/60">
              {currentTenant?.slug ? `@${currentTenant.slug}` : 'Dashboard'}
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center space-x-3 ${
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-xs font-medium">{user?.user_metadata?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
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
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
          <DrawerDescription>
            Navegue pelas funcionalidades do sistema
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  onClick={() => setOpen(false)}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="grid grid-cols-4">
        {bottomTabItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center space-y-1 p-3 transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.title}</span>
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
      className="md:hidden fixed bottom-20 right-4 rounded-full w-14 h-14 shadow-large z-50"
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
        <div className="min-h-screen bg-background">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center space-x-3">
                <MobileDrawer />
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                    <Scissors className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-sm font-semibold text-foreground">
                      {currentTenant?.name || 'BarberSync'}
                    </h1>
                  </div>
                  <TenantSelector />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(), "dd/MM", { locale: ptBR })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile Content */}
          <main className="pb-20">
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
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Desktop Header */}
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between px-6 h-14">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger />
                  <TenantSelector />
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button variant="default" size="sm" onClick={openBookingModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Agendamento
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={user?.user_metadata?.avatar_url} />
                          <AvatarFallback>
                            {user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline">
                          {user?.user_metadata?.name || 'Usuário'}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <User className="h-4 w-4 mr-2" />
                        Perfil
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* Desktop Content */}
            <main className="flex-1 p-6">
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