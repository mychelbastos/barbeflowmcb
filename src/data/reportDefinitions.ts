import {
  User, Users, DollarSign, CalendarDays, Scissors, Gift, Package, Banknote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ReportCategory = "clientes" | "profissionais" | "financeiro" | "agenda" | "servicos" | "pacotes" | "produtos" | "caixa";
export type FilterType = "period" | "staff" | "service" | "month" | "days" | "status";

export interface ReportDefinition {
  id: string;
  category: ReportCategory;
  name: string;
  description: string;
  hasChart: boolean;
  filters: FilterType[];
  component: string;
}

export const categoryConfig: Record<ReportCategory, { label: string; icon: LucideIcon }> = {
  clientes:      { label: "Clientes",      icon: User },
  profissionais: { label: "Profissionais", icon: Users },
  financeiro:    { label: "Financeiro",    icon: DollarSign },
  agenda:        { label: "Agenda",        icon: CalendarDays },
  servicos:      { label: "Serviços",      icon: Scissors },
  pacotes:       { label: "Pacotes",       icon: Gift },
  produtos:      { label: "Produtos",      icon: Package },
  caixa:         { label: "Caixa",         icon: Banknote },
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  // --- CLIENTES ---
  { id: "C01", category: "clientes", name: "Aniversariantes do período", description: "Clientes que fazem aniversário em algum período definido", hasChart: false, filters: ["month"], component: "BirthdayClientsReport" },
  { id: "C02", category: "clientes", name: "Clientes atendidos", description: "Visitas e valor consumido por cliente no período", hasChart: false, filters: ["period"], component: "AttendedClientsReport" },
  { id: "C03", category: "clientes", name: "Lista completa de clientes", description: "Dados cadastrais de todos os clientes: nome, telefone, e-mail e aniversário", hasChart: false, filters: [], component: "ClientListReport" },
  { id: "C04", category: "clientes", name: "Clientes com crédito e/ou débito", description: "Clientes que possuem créditos e/ou débitos em aberto", hasChart: false, filters: [], component: "ClientBalanceReport" },
  { id: "C05", category: "clientes", name: "Taxa de retorno dos clientes", description: "Percentual de clientes que retornaram ao estabelecimento no período", hasChart: true, filters: ["period"], component: "ReturnRateReport" },
  { id: "C06", category: "clientes", name: "Clientes que fizeram serviço específico", description: "Todos os clientes que realizaram um serviço específico no período", hasChart: false, filters: ["period", "service"], component: "ClientsByServiceReport" },
  { id: "C07", category: "clientes", name: "Clientes cadastrados no período", description: "Todos os clientes que foram cadastrados em um período definido", hasChart: false, filters: ["period"], component: "NewClientsReport" },
  { id: "C08", category: "clientes", name: "Clientes com dados incompletos", description: "Clientes que não informaram telefone, e-mail ou data de nascimento", hasChart: false, filters: [], component: "IncompleteClientsReport" },
  { id: "C09", category: "clientes", name: "Clientes novos que fizeram serviço", description: "Clientes atendidos pela primeira vez no período", hasChart: false, filters: ["period"], component: "FirstTimeClientsReport" },
  { id: "C10", category: "clientes", name: "Clientes com celulares duplicados", description: "Clientes que possuem o mesmo número de celular cadastrado", hasChart: false, filters: [], component: "DuplicatePhoneReport" },
  { id: "C11", category: "clientes", name: "Clientes com e-mails duplicados", description: "Clientes que possuem o mesmo e-mail cadastrado", hasChart: false, filters: [], component: "DuplicateEmailReport" },
  { id: "C12", category: "clientes", name: "Clientes que não retornam há dias", description: "Lista de clientes que não voltaram nos últimos dias definidos", hasChart: false, filters: ["days"], component: "InactiveClientsReport" },
  { id: "C13", category: "clientes", name: "Perfil de compra dos clientes", description: "Perfil de compras: analisa todo o histórico para determinar o perfil", hasChart: true, filters: ["period"], component: "PurchaseProfileReport" },
  { id: "C14", category: "clientes", name: "Clientes que fizeram agendamento online", description: "Clientes que já fizeram pelo menos um agendamento pelo site", hasChart: false, filters: ["period"], component: "OnlineBookingClientsReport" },
  { id: "C15", category: "clientes", name: "Clientes por frequência de visitas", description: "Classificação dos clientes por faixa de frequência de visitas", hasChart: true, filters: ["period"], component: "ClientFrequencyReport" },
  { id: "C16", category: "clientes", name: "Retorno recomendado não realizado", description: "Clientes com retorno recomendado que não voltaram", hasChart: false, filters: ["days"], component: "MissedReturnClientsReport" },
  { id: "C17", category: "clientes", name: "Cortesias dadas no período", description: "Comandas de clientes que ganharam cortesia no período", hasChart: false, filters: ["period"], component: "CourtesyReport" },

  // --- PROFISSIONAIS ---
  { id: "P01", category: "profissionais", name: "Faturamento por profissional", description: "Faturamento total, comandas e ticket médio por profissional", hasChart: true, filters: ["period"], component: "StaffRevenueReport" },
  { id: "P02", category: "profissionais", name: "Serviços por profissional", description: "Serviços realizados, faturamento e valores médios por profissional", hasChart: true, filters: ["period", "staff"], component: "StaffServicesReport" },
  { id: "P03", category: "profissionais", name: "Clientes atendidos por profissional", description: "Clientes atendidos com telefones, e-mails e valores por profissional", hasChart: false, filters: ["period", "staff"], component: "StaffClientsReport" },
  { id: "P04", category: "profissionais", name: "Comissões pagas no período", description: "Comissões pagas com datas, valores e formas de pagamento", hasChart: false, filters: ["period"], component: "CommissionsPaidReport" },
  { id: "P05", category: "profissionais", name: "Quantidade de agendamentos por profissional", description: "Quantidade de agendamentos por profissional no período", hasChart: true, filters: ["period"], component: "StaffBookingsCountReport" },
  { id: "P06", category: "profissionais", name: "Histórico de retorno por profissional", description: "Taxa de retorno dos clientes por profissional", hasChart: false, filters: ["period", "staff"], component: "StaffReturnRateReport" },
  { id: "P07", category: "profissionais", name: "Comissões brutas por profissional", description: "Itens das comandas que geram comissões brutas para o profissional", hasChart: true, filters: ["period", "staff"], component: "StaffGrossCommissionsReport" },
  { id: "P08", category: "profissionais", name: "Profissionais e produtos vendidos", description: "Ranking de profissionais que mais faturaram com vendas de produtos", hasChart: true, filters: ["period"], component: "StaffProductSalesReport" },
  { id: "P09", category: "profissionais", name: "Dias trabalhados e média de reservas", description: "Dias trabalhados, total de reservas e média por dia por profissional", hasChart: false, filters: ["period"], component: "StaffWorkdaysReport" },
  { id: "P10", category: "profissionais", name: "Profissionais aniversariantes", description: "Profissionais que fazem aniversário no período definido", hasChart: false, filters: ["month"], component: "StaffBirthdayReport" },

  // --- FINANCEIRO ---
  { id: "F01", category: "financeiro", name: "Evolução do faturamento mensal", description: "Faturamento total e ticket médio por mês", hasChart: true, filters: ["period"], component: "RevenueEvolutionReport" },
  { id: "F02", category: "financeiro", name: "Faturamento por forma de pagamento", description: "Entradas financeiras classificadas por forma de pagamento", hasChart: true, filters: ["period"], component: "PaymentMethodReport" },
  { id: "F03", category: "financeiro", name: "Entradas e saídas", description: "Todas as movimentações financeiras de entradas e saídas", hasChart: false, filters: ["period"], component: "CashFlowReport" },
  { id: "F04", category: "financeiro", name: "Faturamento e ticket médio por clientes", description: "Faturamento total e ticket médio dos serviços por cliente", hasChart: false, filters: ["period"], component: "ClientRevenueReport" },
  { id: "F05", category: "financeiro", name: "Faturamento diário", description: "Evolução do faturamento diário no período", hasChart: true, filters: ["period"], component: "DailyRevenueReport" },
  { id: "F06", category: "financeiro", name: "Faturamento por dias da semana", description: "Evolução do faturamento por dia da semana", hasChart: true, filters: ["period"], component: "WeekdayRevenueReport" },
  { id: "F07", category: "financeiro", name: "Todos os serviços e produtos vendidos", description: "Serviços e produtos vendidos no período definido", hasChart: false, filters: ["period"], component: "AllSalesReport" },
  { id: "F08", category: "financeiro", name: "Faturamento por serviço de profissional", description: "Faturamentos brutos para estabelecimento e profissionais", hasChart: false, filters: ["period"], component: "StaffServiceRevenueReport" },
  { id: "F09", category: "financeiro", name: "Entrada por forma de pagamento e cliente", description: "Valores pagos por cliente no período por forma de pagamento", hasChart: false, filters: ["period"], component: "ClientPaymentReport" },
  { id: "F10", category: "financeiro", name: "Faturamento por itens", description: "Faturamentos por tipo de item: serviço, produto, extra", hasChart: true, filters: ["period"], component: "RevenueByItemTypeReport" },
  { id: "F11", category: "financeiro", name: "Comandas com serviços e/ou produtos", description: "Lista de comandas classificadas pelos tipos de itens", hasChart: false, filters: ["period"], component: "BookingItemsReport" },
  { id: "F12", category: "financeiro", name: "Despesas por categoria", description: "Totais gastos classificados por categoria de despesa", hasChart: true, filters: ["period"], component: "ExpenseByCategoryReport" },
  { id: "F13", category: "financeiro", name: "Comandas com diferenças", description: "Discrepâncias entre valor do item e valor pago", hasChart: false, filters: ["period"], component: "BookingDiscrepancyReport" },
  { id: "F14", category: "financeiro", name: "Pagamentos recebidos online", description: "Pagamentos recebidos via pagamento online (Mercado Pago)", hasChart: false, filters: ["period"], component: "OnlinePaymentsReport" },
  { id: "F15", category: "financeiro", name: "Itens das comandas sem profissionais", description: "Itens de comandas sem profissional atrelado no período", hasChart: false, filters: ["period"], component: "UnassignedItemsReport" },

  // --- AGENDA ---
  { id: "A01", category: "agenda", name: "Valor total dos agendamentos", description: "Valor total de todos os agendamentos no período (exceto cancelados)", hasChart: false, filters: ["period"], component: "BookingsTotalValueReport" },
  { id: "A02", category: "agenda", name: "Agendamentos por origem", description: "Agendamentos por meio: Painel Admin ou Agendamento Online", hasChart: true, filters: ["period"], component: "BookingsByOriginReport" },
  { id: "A03", category: "agenda", name: "Clientes com agendamentos cancelados", description: "Clientes com agendamentos cancelados no período", hasChart: false, filters: ["period"], component: "CancelledBookingsReport" },
  { id: "A04", category: "agenda", name: "Agendamentos por status", description: "Agendamentos classificados por status no período", hasChart: true, filters: ["period"], component: "BookingsByStatusReport" },
  { id: "A05", category: "agenda", name: "Clientes que não retornaram vs mês anterior", description: "Clientes do mês anterior que não retornaram no mês atual", hasChart: false, filters: ["period"], component: "ChurnedClientsReport" },
  { id: "A06", category: "agenda", name: "Agendamentos por status e serviço", description: "Reservas por status filtradas por serviço no período", hasChart: true, filters: ["period", "service"], component: "BookingsByStatusServiceReport" },
  { id: "A07", category: "agenda", name: "Profissionais com agendamentos", description: "Profissionais com agendamentos, contagem e valores no período", hasChart: false, filters: ["period"], component: "StaffWithBookingsReport" },
  { id: "A08", category: "agenda", name: "Agendamentos por filtro de serviço", description: "Clientes com agendamentos filtrados por serviço no período", hasChart: false, filters: ["period", "service"], component: "BookingsByServiceFilterReport" },
  { id: "A09", category: "agenda", name: "Número de agendamentos por dia", description: "Evolução do número de agendamentos recebidos por dia", hasChart: true, filters: ["period"], component: "DailyBookingsCountReport" },

  // --- SERVIÇOS ---
  { id: "S01", category: "servicos", name: "Serviços realizados no período", description: "Todos os serviços realizados com informações detalhadas", hasChart: false, filters: ["period"], component: "ServicesPerformedReport" },
  { id: "S02", category: "servicos", name: "Serviços mais vendidos", description: "Ranking de serviços por quantidade vendida e faturamento", hasChart: true, filters: ["period"], component: "TopServicesReport" },
  { id: "S03", category: "servicos", name: "Tabela de preços dos serviços", description: "Todos os serviços e seus respectivos valores", hasChart: false, filters: [], component: "ServicePriceListReport" },
  { id: "S04", category: "servicos", name: "Diferença entre agendados e realizados", description: "Comparação entre serviços agendados e efetivamente realizados", hasChart: false, filters: ["period"], component: "BookedVsPerformedReport" },
  { id: "S05", category: "servicos", name: "Lucratividade dos serviços", description: "Lucratividade por item de comanda: venda vs custo", hasChart: true, filters: ["period"], component: "ServiceProfitabilityReport" },

  // --- PACOTES ---
  { id: "K01", category: "pacotes", name: "Pacotes vendidos", description: "Todos os pacotes vendidos, cliente e valor", hasChart: false, filters: ["period"], component: "SoldPackagesReport" },
  { id: "K02", category: "pacotes", name: "Pacotes mais vendidos", description: "Pacotes mais vendidos e respectivas quantidades", hasChart: true, filters: ["period"], component: "TopPackagesReport" },
  { id: "K03", category: "pacotes", name: "Clientes com pacotes ativos", description: "Clientes que possuem pacotes ativos dentro do prazo", hasChart: false, filters: [], component: "ActivePackagesReport" },
  { id: "K04", category: "pacotes", name: "Sessões de pacotes utilizadas", description: "Itens consumidos de pacotes no período", hasChart: false, filters: ["period"], component: "PackageUsageReport" },
  { id: "K05", category: "pacotes", name: "Pacotes vendidos por profissional", description: "Pacotes vendidos filtrados por profissional no período", hasChart: false, filters: ["period", "staff"], component: "PackagesByStaffReport" },
  { id: "K06", category: "pacotes", name: "Tabela de preços dos pacotes", description: "Pacotes com serviços incluídos e respectivos valores", hasChart: false, filters: [], component: "PackagePriceListReport" },

  // --- PRODUTOS ---
  { id: "D01", category: "produtos", name: "Produtos vendidos", description: "Todos os produtos vendidos no período definido", hasChart: false, filters: ["period"], component: "SoldProductsReport" },
  { id: "D02", category: "produtos", name: "Produtos mais vendidos", description: "Ranking de produtos mais vendidos no período", hasChart: true, filters: ["period"], component: "TopProductsReport" },
  { id: "D03", category: "produtos", name: "Tabela de preços e lucros dos produtos", description: "Produtos com valor de compra, venda e percentual de lucro", hasChart: false, filters: [], component: "ProductPriceListReport" },
  { id: "D04", category: "produtos", name: "Lucratividade dos produtos vendidos", description: "Lucro por produto vendido, considerando comissão e custo", hasChart: true, filters: ["period"], component: "ProductProfitabilityReport" },
  { id: "D05", category: "produtos", name: "Produtos com saídas", description: "Produtos ativos com saídas por venda ou consumo no período", hasChart: false, filters: ["period"], component: "ProductOutflowReport" },
  { id: "D06", category: "produtos", name: "Produtos vendidos por profissional", description: "Produtos vendidos filtrados por profissional no período", hasChart: false, filters: ["period", "staff"], component: "ProductsByStaffReport" },

  // --- CAIXA ---
  { id: "X01", category: "caixa", name: "Detalhamento dos caixas do período", description: "Registros de abertura e fechamento de caixa no período", hasChart: false, filters: ["period"], component: "CashSessionsReport" },
  { id: "X02", category: "caixa", name: "Movimentações do caixa", description: "Suprimentos e sangrias do caixa no período", hasChart: false, filters: ["period"], component: "CashMovementsReport" },
  { id: "X03", category: "caixa", name: "Entradas por caixa", description: "Entradas de pagamentos para o caixa no período", hasChart: false, filters: ["period"], component: "CashIncomeReport" },
];

export const categoryOrder: ReportCategory[] = ["clientes", "profissionais", "financeiro", "agenda", "servicos", "pacotes", "produtos", "caixa"];
