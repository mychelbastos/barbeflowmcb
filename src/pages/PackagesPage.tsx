import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServicePackagesTab } from "@/components/ServicePackagesTab";
import { PackageCustomersList } from "@/components/packages/PackageCustomersList";

export default function PackagesPage() {
  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Pacotes de Serviços</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie pacotes de sessões para seus clientes
        </p>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Pacotes</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <ServicePackagesTab />
        </TabsContent>

        <TabsContent value="customers">
          <PackageCustomersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
