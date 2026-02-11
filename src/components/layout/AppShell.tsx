import { useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useIsMobile } from "@/hooks/use-mobile";
import { dashPath } from "@/lib/hostname";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
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
  ChevronDown,
  MessageCircle,
  Package,
  ShoppingBag,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Gift,
  Repeat,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBookingModal } from "@/hooks/useBookingModal";
import { BookingModal } from "@/components/modals/BookingModal";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  children?: { title: string; url: string; icon: any }[];
}

const baseNavigationItems: NavItem[] = [
  { title: "Dashboard", url: "/app/dashboard", icon: Home },
  { title: "Agendamentos", url: "/app/bookings", icon: FileText },
  { 
    title: "Clientes", 
    url: "/app/customers", 
    icon: User,
    children: [
      { title: "Listar Clientes", url: "/app/customers", icon: User },
      { title: "Clientes Fixos", url: "/app/recurring-clients", icon: CalendarCheck },
    ]
  },
  { 
    title: "Catálogo", 
    url: "/app/services", 
    icon: ShoppingBag,
    children: [
      { title: "Serviços", url: "/app/services", icon: Scissors },
      { title: "Pacotes", url: "/app/packages", icon: Gift },
      { title: "Assinaturas", url: "/app/subscription-plans", icon: Repeat },
      { title: "Produtos", url: "/app/products", icon: Package },
    ]
  },
  { title: "Profissionais", url: "/app/staff", icon: Users },
  { 
    title: "Financeiro", 
    url: "/app/finance", 
    icon: Wallet,
    children: [
      { title: "Visão Geral", url: "/app/finance", icon: BarChart3 },
      { title: "Comissões", url: "/app/commissions", icon: CreditCard },
    ]
  },
  { title: "WhatsApp", url: "/app/whatsapp/inbox", icon: MessageCircle },
  { title: "Configurações", url: "/app/settings", icon: Settings },
];

const baseBottomTabItems = [
  { title: "Home", url: "/app/dashboard", icon: Home },
  { title: "Agenda", url: "/app/bookings", icon: CalendarCheck },
  { title: "Clientes", url: "/app/customers", icon: User },
  { title: "Financeiro", url: "/app/finance", icon: Wallet },
];

const applyDashPath = (items: NavItem[]): NavItem[] => items.map(item => ({
  ...item,
  url: dashPath(item.url),
  children: item.children?.map(child => ({ ...child, url: dashPath(child.url) })),
}));

const navigationItems = applyDashPath(baseNavigationItems);
const bottomTabItems = baseBottomTabItems.map(item => ({ ...item, url: dashPath(item.url) }));

function NavItemLink({ item, isActive, onClick }: { item: { title: string; url: string; icon: any }; isActive: boolean; onClick?: () => void }) {
  return (
    <NavLink
      to={item.url}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
        isActive 
          ? 'text-emerald-400' 
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30'
      }`}
    >
      {isActive && (
        <motion.div 
          layoutId="activeNav"
          className="absolute inset-0 bg-emerald-500/[0.08] rounded-xl border border-emerald-500/20"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <item.icon className={`h-4 w-4 relative z-10 transition-colors duration-300 ${isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
      <span className="text-sm font-medium relative z-10">{item.title}</span>
      {isActive && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 relative z-10"
        />
      )}
    </NavLink>
  );
}

function CollapsibleNavItem({ item, location }: { item: NavItem; location: any }) {
  const isAnyChildActive = item.children?.some(child => location.pathname === child.url) || false;
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 w-full ${
        isAnyChildActive 
          ? 'text-emerald-400' 
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30'
      }`}>
        <item.icon className={`h-4 w-4 ${isAnyChildActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
        <span className="text-sm font-medium">{item.title}</span>
        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
        {item.children?.map((child) => {
          const isActive = location.pathname === child.url;
          return (
            <SidebarMenuItem key={child.url}>
              <SidebarMenuButton asChild>
                <NavItemLink item={child} isActive={isActive} />
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AppSidebar() {
  const { currentTenant } = useTenant();
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-zinc-800/30 bg-zinc-950/80 backdrop-blur-xl">
      <SidebarHeader className="p-5 border-b border-zinc-800/30">
        <div className="flex items-center gap-3">
          {currentTenant?.logo_url ? (
            <div className="relative">
              <img src={currentTenant.logo_url} alt={currentTenant.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-800/50" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
            </div>
          ) : (
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-zinc-100 truncate tracking-tight">
              {currentTenant?.name || 'BarberFlow'}
            </h1>
            <p className="text-[11px] text-zinc-600 font-medium">
              {currentTenant?.slug ? `@${currentTenant.slug}` : 'Dashboard'}
            </p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-3 mt-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navigationItems.map((item) => {
                if (item.children) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <CollapsibleNavItem item={item} location={location} />
                    </SidebarMenuItem>
                  );
                }
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavItemLink item={item} isActive={isActive} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-zinc-800/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2.5 h-auto hover:bg-zinc-800/30 rounded-xl transition-all duration-300">
              <div className="relative mr-3">
                <Avatar className="h-9 w-9 ring-2 ring-zinc-800/50">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-300 text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-zinc-200 tracking-tight">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-[11px] text-zinc-600 truncate">
                  {user?.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 backdrop-blur-xl border-zinc-800/50 shadow-xl shadow-black/30">
            <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800/50 focus:text-zinc-100 rounded-lg">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800/50" />
            <DropdownMenuItem onClick={signOut} className="text-zinc-300 focus:bg-red-500/10 focus:text-red-400 rounded-lg">
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
  const { user, signOut } = useAuth();
  const { currentTenant } = useTenant();

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-zinc-950/95 backdrop-blur-2xl border-zinc-800/30 max-h-[85vh]">
        <DrawerHeader className="border-b border-zinc-800/30 pb-4">
          <div className="flex items-center gap-3">
            {currentTenant?.logo_url ? (
              <img src={currentTenant.logo_url} alt={currentTenant.name} className="w-11 h-11 rounded-xl object-cover ring-1 ring-zinc-800/50" />
            ) : (
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Scissors className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <DrawerTitle className="text-zinc-100 text-left font-bold tracking-tight">{currentTenant?.name || 'BarberFlow'}</DrawerTitle>
              <DrawerDescription className="text-zinc-600 text-left text-xs">
                {user?.email}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <div className="p-3 overflow-y-auto flex-1">
          <div className="space-y-0.5">
            {navigationItems.map((item) => {
              if (item.children) {
                const isAnyChildActive = item.children.some(c => location.pathname === c.url);
                return (
                  <div key={item.title} className="mt-4 first:mt-0">
                    <div className={`flex items-center gap-2.5 px-3 py-2 ${isAnyChildActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">{item.title}</span>
                    </div>
                    <div className="ml-2 border-l border-zinc-800/40 pl-2 space-y-0.5">
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.url;
                        return (
                          <NavLink
                            key={child.url}
                            to={child.url}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                              isActive 
                                ? 'bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/20' 
                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 active:bg-zinc-800/50 border border-transparent'
                            }`}
                          >
                            <child.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{child.title}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              const isActive = location.pathname === item.url;
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/20' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 active:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </NavLink>
              );
            })}
          </div>
        </div>
        <div className="p-3 border-t border-zinc-800/30">
          <Button 
            variant="ghost" 
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full justify-start text-zinc-500 hover:text-red-400 hover:bg-red-500/10 h-11 rounded-xl"
          >
            <LogOut className="h-4 w-4 mr-3" />
            <span className="text-sm font-medium">Sair da conta</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function BottomTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-800/30 z-50 safe-area-pb">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {bottomTabItems.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url === dashPath("/app/finance") && location.pathname === dashPath("/app/commissions"));
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={`flex flex-col items-center gap-1 py-3 min-h-[56px] transition-all duration-300 relative ${
                isActive 
                  ? 'text-emerald-400' 
                  : 'text-zinc-600 active:text-zinc-300'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="bottomTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <item.icon className="h-5 w-5" />
              </motion.div>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? '' : 'font-medium'}`}>{item.title}</span>
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
    <motion.div
      className="md:hidden fixed bottom-[76px] right-4 z-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
    >
      <Button
        onClick={() => openBookingModal()}
        size="lg"
        className="rounded-full w-14 h-14 shadow-xl shadow-emerald-500/25 bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-0"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </motion.div>
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
          <header className="sticky top-0 z-40 border-b border-zinc-800/30 bg-zinc-950/90 backdrop-blur-2xl">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-3">
                <MobileDrawer />
                <div className="flex items-center gap-2.5">
                  {currentTenant?.logo_url ? (
                    <img src={currentTenant.logo_url} alt={currentTenant.name} className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-800/50" />
                  ) : (
                    <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/20">
                      <Scissors className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm font-bold text-zinc-100 tracking-tight">
                      {currentTenant?.name || 'BarberFlow'}
                    </h1>
                  </div>
                  <TenantSelector />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-600 font-medium tabular-nums">
                  {format(new Date(), "dd/MM", { locale: ptBR })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-zinc-800/30 rounded-xl p-1">
                      <Avatar className="h-7 w-7 ring-1 ring-zinc-800/50">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-400 text-xs font-bold">
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800/50 shadow-xl">
                    <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800/50 focus:text-zinc-100 rounded-lg">
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800/50" />
                    <DropdownMenuItem onClick={signOut} className="text-zinc-300 focus:bg-red-500/10 focus:text-red-400 rounded-lg">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile Content */}
          <main className="pb-28 bg-zinc-950">
            <div className="pt-3">
              <Outlet />
            </div>
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
            <header className="sticky top-0 z-40 border-b border-zinc-800/30 bg-zinc-950/80 backdrop-blur-2xl">
              <div className="flex items-center justify-between px-6 h-14">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-zinc-500 hover:text-zinc-200 transition-colors" />
                  <TenantSelector />
                  <div className="h-4 w-px bg-zinc-800/50" />
                  <div className="text-sm text-zinc-600 font-medium">
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button 
                      size="sm" 
                      onClick={() => openBookingModal()}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20 border-0 rounded-xl px-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Agendamento
                    </Button>
                  </motion.div>
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
