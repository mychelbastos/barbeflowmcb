import { useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { dashPath } from "@/lib/hostname";
import { SubscriptionBanner } from "@/components/billing/SubscriptionBanner";
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
  Crown,
  Palette,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBookingModal } from "@/hooks/useBookingModal";
import { BookingModal } from "@/components/modals/BookingModal";
import InstallPWA from "@/components/InstallPWA";
import { motion, AnimatePresence } from "framer-motion";
import logoBranca from "@/assets/modoGESTOR_branca.png";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  statusDot?: boolean;
  children?: { title: string; url: string; icon: any; statusDot?: boolean }[];
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
  { 
    title: "Configurações", 
    url: "/app/settings", 
    icon: Settings,
    children: [
      { title: "Geral", url: "/app/settings?tab=general", icon: Settings },
      { title: "Aparência", url: "/app/settings?tab=appearance", icon: Palette },
      { title: "Agendamento", url: "/app/settings?tab=scheduling", icon: CalendarCheck },
      { title: "Notificações", url: "/app/settings?tab=notifications", icon: MessageCircle },
      { title: "Pagamentos", url: "/app/settings?tab=payments", icon: CreditCard },
      { title: "Assinatura", url: "/app/settings?tab=billing", icon: Crown },
      { title: "WhatsApp", url: "/app/settings?tab=whatsapp", icon: MessageCircle, statusDot: true },
    ]
  },
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

function NavItemLink({ item, isActive, onClick, statusDot }: { item: { title: string; url: string; icon: any }; isActive: boolean; onClick?: () => void; statusDot?: 'connected' | 'disconnected' | null }) {
  return (
    <NavLink
      to={item.url}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500 relative overflow-hidden ${
        isActive 
          ? 'text-primary' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
      }`}
    >
      {isActive && (
        <motion.div 
          layoutId="activeNav"
          className="absolute inset-0 bg-primary/[0.08] rounded-xl border border-primary/20"
          transition={{ type: "spring", stiffness: 180, damping: 24, mass: 0.8 }}
        />
      )}
      <motion.div
        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10"
      >
        <item.icon className={`h-4 w-4 transition-colors duration-500 ${isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-muted-foreground'}`} />
      </motion.div>
      <span className="text-sm font-medium relative z-10">{item.title}</span>
      {statusDot && (
        <span className={`relative z-10 ml-auto w-2 h-2 rounded-full ${statusDot === 'connected' ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
      )}
      {!statusDot && isActive && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary relative z-10"
        />
      )}
    </NavLink>
  );
}

function CollapsibleNavItem({ item, location, waConnected }: { item: NavItem; location: any; waConnected?: boolean | null }) {
  const fullUrl = location.pathname + location.search;
  const isAnyChildActive = item.children?.some(child => {
    if (child.url.includes('?')) return fullUrl === child.url;
    return location.pathname === child.url;
  }) || false;
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 w-full ${
        isAnyChildActive 
          ? 'text-primary' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
      }`}>
        <item.icon className={`h-4 w-4 ${isAnyChildActive ? 'text-primary' : 'text-muted-foreground/60'}`} />
        <span className="text-sm font-medium">{item.title}</span>
        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
        {item.children?.map((child) => {
          const isActive = child.url.includes('?') 
            ? fullUrl === child.url 
            : location.pathname === child.url;
          return (
            <SidebarMenuItem key={child.url}>
              <SidebarMenuButton asChild>
                <NavItemLink 
                  item={child} 
                  isActive={isActive} 
                  statusDot={child.statusDot ? (waConnected ? 'connected' : 'disconnected') : null}
                />
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
  const waConnected = useWhatsAppStatus();

  return (
    <Sidebar className="border-r border-border/30 bg-background/80 backdrop-blur-xl">
      <SidebarHeader className="p-5 border-b border-border/30">
        <div className="flex items-center gap-3">
          {currentTenant?.logo_url ? (
            <div className="relative">
              <img src={currentTenant.logo_url} alt={currentTenant.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-border/50" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background" />
            </div>
          ) : (
            <div className="relative">
              <img src={logoBranca} alt="modoGESTOR" className="h-6 dark:block hidden" />
              <img src={logoBranca} alt="modoGESTOR" className="h-6 dark:hidden block invert" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate tracking-tight">
              {currentTenant?.name || 'modoGESTOR'}
            </h1>
            <p className="text-[11px] text-muted-foreground/60 font-medium">
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
                      <CollapsibleNavItem item={item} location={location} waConnected={waConnected} />
                    </SidebarMenuItem>
                  );
                }
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavItemLink 
                        item={item} 
                        isActive={isActive} 
                        statusDot={item.statusDot ? (waConnected ? 'connected' : 'disconnected') : null}
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2.5 h-auto hover:bg-muted/30 rounded-xl transition-all duration-300">
              <div className="relative mr-3">
                <Avatar className="h-9 w-9 ring-2 ring-border/50">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground tracking-tight">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-[11px] text-muted-foreground/60 truncate">
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
            <DropdownMenuItem onClick={signOut} className="focus:bg-destructive/10 focus:text-destructive">
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
  const waConnected = useWhatsAppStatus();

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-background/95 backdrop-blur-2xl border-border/30 max-h-[85vh]">
        <DrawerHeader className="border-b border-border/30 pb-4">
          <div className="flex items-center gap-3">
            {currentTenant?.logo_url ? (
              <img src={currentTenant.logo_url} alt={currentTenant.name} className="w-11 h-11 rounded-xl object-cover ring-1 ring-border/50" />
            ) : (
              <>
                <img src={logoBranca} alt="modoGESTOR" className="h-7 dark:block hidden" />
                <img src={logoBranca} alt="modoGESTOR" className="h-7 dark:hidden block invert" />
              </>
            )}
            <div className="flex-1">
              <DrawerTitle className="text-foreground text-left font-bold tracking-tight">{currentTenant?.name || 'modoGESTOR'}</DrawerTitle>
              <DrawerDescription className="text-muted-foreground text-left text-xs">
                {user?.email}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <div className="p-3 overflow-y-auto flex-1">
          <div className="space-y-0.5">
            {navigationItems.map((item) => {
              if (item.children) {
                const fullUrl = location.pathname + location.search;
                const isAnyChildActive = item.children.some(c => {
                  if (c.url.includes('?')) return fullUrl === c.url;
                  return location.pathname === c.url;
                });
                return (
                  <div key={item.title} className="mt-4 first:mt-0">
                    <div className={`flex items-center gap-2.5 px-3 py-2 ${isAnyChildActive ? 'text-primary' : 'text-muted-foreground/60'}`}>
                      <item.icon className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">{item.title}</span>
                    </div>
                    <div className="ml-2 border-l border-border/40 pl-2 space-y-0.5">
                      {item.children.map((child) => {
                        const isActive = child.url.includes('?')
                          ? fullUrl === child.url
                          : location.pathname === child.url;
                        return (
                          <NavLink
                            key={child.url}
                            to={child.url}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                              isActive 
                                ? 'bg-primary/[0.08] text-primary border border-primary/20' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 active:bg-muted/50 border border-transparent'
                            }`}
                          >
                            <child.icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{child.title}</span>
                            {child.statusDot && (
                              <span className={`ml-auto w-2 h-2 rounded-full ${waConnected ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                            )}
                            {!child.statusDot && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
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
                      ? 'bg-primary/[0.08] text-primary border border-primary/20' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 active:bg-muted/50 border border-transparent'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.title}</span>
                  {item.statusDot && (
                    <span className={`ml-auto w-2 h-2 rounded-full ${waConnected ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                  )}
                  {!item.statusDot && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </NavLink>
              );
            })}
          </div>
        </div>
        <div className="p-3 border-t border-border/30">
          <Button 
            variant="ghost" 
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-11 rounded-xl"
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-2xl border-t border-border/30 z-50 safe-area-pb">
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
                  ? 'text-primary' 
                  : 'text-muted-foreground/60 active:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="bottomTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-gradient-to-r from-primary to-amber-400 rounded-full"
                  transition={{ type: "spring", stiffness: 220, damping: 22, mass: 0.6 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18, mass: 0.5 }}
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
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.3 }}
      whileHover={{ scale: 1.08, transition: { type: "spring", stiffness: 300, damping: 15 } }}
      whileTap={{ scale: 0.88, transition: { duration: 0.1 } }}
    >
      <Button
        onClick={() => openBookingModal()}
        size="lg"
        className="rounded-full w-14 h-14 shadow-xl shadow-primary/25 bg-gradient-to-br from-primary to-amber-500 hover:from-primary hover:to-amber-400 text-primary-foreground border-0"
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
  const { needsSubscription, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Redirect to onboarding if no subscription (except billing page)
  const isBillingPage = location.pathname.includes("/settings") && location.search.includes("tab=billing");
  const isOnboardingPage = location.pathname.includes("/onboarding");
  if (!subLoading && needsSubscription && !isBillingPage && !isOnboardingPage) {
    return <Navigate to={dashPath("/app/onboarding")} replace />;
  }

  if (isMobile) {
    return (
      <>
        <div className="min-h-screen bg-background">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 border-b border-border/30 bg-background/90 backdrop-blur-2xl">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-3">
                <MobileDrawer />
                <div className="flex items-center gap-2.5">
                  {currentTenant?.logo_url ? (
                    <img src={currentTenant.logo_url} alt={currentTenant.name} className="w-7 h-7 rounded-lg object-cover ring-1 ring-border/50" />
                  ) : (
                    <>
                      <img src={logoBranca} alt="modoGESTOR" className="h-5 dark:block hidden" />
                      <img src={logoBranca} alt="modoGESTOR" className="h-5 dark:hidden block invert" />
                    </>
                  )}
                  <div>
                    <h1 className="text-sm font-bold text-foreground tracking-tight">
                      {currentTenant?.name || 'modoGESTOR'}
                    </h1>
                  </div>
                  <TenantSelector />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/60 font-medium tabular-nums">
                  {format(new Date(), "dd/MM", { locale: ptBR })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-muted/30 rounded-xl p-1">
                      <Avatar className="h-7 w-7 ring-1 ring-border/50">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
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
                    <DropdownMenuItem onClick={signOut} className="focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Subscription Banner */}
          <SubscriptionBanner />

          {/* Mobile Content */}
          <main className="pb-28 bg-background overflow-x-hidden">
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
        <InstallPWA />
      </>
    );
  }

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Desktop Header */}
            <header className="sticky top-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-2xl">
              <div className="flex items-center justify-between px-6 h-14">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
                  <TenantSelector />
                  <div className="h-4 w-px bg-border/50" />
                  <div className="text-sm text-muted-foreground font-medium">
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.04, transition: { type: "spring", stiffness: 300, damping: 20 } }} whileTap={{ scale: 0.94, transition: { duration: 0.08 } }}>
                    <Button 
                      size="sm" 
                      onClick={() => openBookingModal()}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/70 text-primary-foreground font-semibold shadow-lg shadow-primary/20 border-0 rounded-xl px-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Agendamento
                    </Button>
                  </motion.div>
                </div>
              </div>
            </header>

            {/* Subscription Banner */}
            <SubscriptionBanner />

            {/* Desktop Content */}
            <main className="flex-1 p-4 md:p-6 bg-background overflow-x-hidden">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      {/* Global Booking Modal */}
      <BookingModal />
      <InstallPWA />
    </>
  );
}