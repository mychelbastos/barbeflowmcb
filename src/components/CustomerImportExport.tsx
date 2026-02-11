import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBrazilianDate(dateStr: string): string | null {
  if (!dateStr || dateStr === "N/A" || dateStr.trim() === "") return null;
  // Try DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  // Try YYYY-MM-DD
  const isoParts = dateStr.split("-");
  if (isoParts.length === 3 && isoParts[0].length === 4) {
    return dateStr;
  }
  return null;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Detect separator by checking the header line */
function detectSeparator(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

/** Fetch ALL existing phones with pagination to avoid the 1000-row limit */
async function fetchAllExistingPhones(tenantId: string): Promise<Set<string>> {
  const phones = new Set<string>();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("customers")
      .select("phone")
      .eq("tenant_id", tenantId)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching existing phones:", error);
      break;
    }
    if (!data || data.length === 0) break;

    data.forEach((c) => phones.add(normalizePhone(c.phone)));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return phones;
}

export function CustomerImportExport() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: "Arquivo vazio", description: "O arquivo não contém dados válidos.", variant: "destructive" });
      return;
    }

    // Detect separator (comma or semicolon)
    const separator = detectSeparator(lines[0]);
    
    const parseRow = (line: string): string[] => {
      if (separator === ";") {
        // Simple split for semicolons (rare to have semicolons in quoted fields)
        return line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
      }
      return parseCSVLine(line);
    };

    const headers = parseRow(lines[0]).map((h) => h.replace(/^\uFEFF/, "").toLowerCase().trim());

    // Flexible column detection
    const nameIdx = headers.findIndex((h) => h.includes("nome") || h.includes("name") || h === "cliente");
    const phoneIdx = headers.findIndex((h) => h.includes("telefone") || h.includes("phone") || h.includes("celular") || h.includes("whatsapp") || h.includes("fone"));
    const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("e-mail"));
    const birthdayIdx = headers.findIndex((h) => h.includes("nascimento") || h.includes("birthday") || h.includes("aniversário") || h.includes("aniversario"));

    if (nameIdx === -1 || phoneIdx === -1) {
      toast({
        title: "Formato inválido",
        description: `Colunas encontradas: ${headers.join(", ")}. O arquivo precisa ter colunas 'Nome' e 'Telefone'.`,
        variant: "destructive",
      });
      return;
    }

    const rows: any[] = [];
    const parseErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseRow(lines[i]);
      const name = cols[nameIdx]?.trim();
      const rawPhone = cols[phoneIdx] || "";
      const phone = normalizePhone(rawPhone);
      const email = emailIdx >= 0 ? cols[emailIdx]?.trim() : null;
      const birthday = birthdayIdx >= 0 ? parseBrazilianDate(cols[birthdayIdx] || "") : null;

      if (!name) {
        if (rawPhone.trim()) parseErrors.push(`Linha ${i + 1}: nome vazio (tel: ${rawPhone})`);
        continue;
      }
      if (phone.length < 10) {
        parseErrors.push(`Linha ${i + 1}: telefone inválido "${rawPhone}" (${name})`);
        continue;
      }

      rows.push({ name, phone, email: email || null, birthday });
    }

    setTotalRows(rows.length);
    setPreviewData(rows.slice(0, 5));

    if (rows.length === 0) {
      toast({
        title: "Nenhum registro válido",
        description: `${parseErrors.length} linhas com problemas. Verifique o formato do arquivo.`,
        variant: "destructive",
      });
      setResult({ imported: 0, skipped: 0, failed: parseErrors.length, errors: parseErrors.slice(0, 20) });
      return;
    }

    handleImport(rows, parseErrors);
  };

  const handleImport = async (rows: any[], parseErrors: string[] = []) => {
    if (!currentTenant) return;
    setImporting(true);
    setProgress(0);

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors: string[] = [...parseErrors.slice(0, 10)];
    const batchSize = 50;

    // Fetch ALL existing phones with pagination
    const existingPhones = await fetchAllExistingPhones(currentTenant.id);

    // Also deduplicate within the import itself
    const seenPhones = new Set<string>();
    const toInsert = rows.filter((r) => {
      if (existingPhones.has(r.phone) || seenPhones.has(r.phone)) {
        skippedCount++;
        return false;
      }
      seenPhones.add(r.phone);
      return true;
    });

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize).map((r) => ({
        tenant_id: currentTenant.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        birthday: r.birthday,
      }));

      const { error } = await supabase.from("customers").insert(batch);
      
      if (error) {
        // If batch failed (likely unique constraint), try one by one
        for (const record of batch) {
          const { error: singleError } = await supabase.from("customers").insert(record);
          if (singleError) {
            failedCount++;
            if (errors.length < 20) {
              errors.push(`${record.name} (${record.phone}): ${singleError.message}`);
            }
          } else {
            importedCount++;
          }
        }
      } else {
        importedCount += batch.length;
      }

      setProgress(Math.min(100, Math.round(((i + batchSize) / toInsert.length) * 100)));
    }

    setProgress(100);
    setResult({
      imported: importedCount,
      skipped: skippedCount,
      failed: failedCount,
      errors,
    });
    setImporting(false);

    toast({
      title: "Importação concluída",
      description: `${importedCount} importados, ${skippedCount} já existiam${failedCount > 0 ? `, ${failedCount} falharam` : ""}.`,
    });
  };

  const handleExport = async () => {
    if (!currentTenant) return;
    setExporting(true);

    try {
      // Paginate export to avoid 1000-row limit
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("customers")
          .select("name, phone, email, birthday, created_at")
          .eq("tenant_id", currentTenant.id)
          .order("name")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const csvHeader = "Nome,Telefone,Email,Data de Nascimento,Data de Cadastro";
      const csvRows = allData.map((c) => {
        const birthday = c.birthday
          ? new Date(c.birthday + "T00:00:00").toLocaleDateString("pt-BR")
          : "";
        const created = new Date(c.created_at).toLocaleDateString("pt-BR");
        return `"${c.name}","${c.phone}","${c.email || ""}","${birthday}","${created}"`;
      });

      const csvContent = "\uFEFF" + csvHeader + "\n" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clientes-${currentTenant.slug}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Exportação concluída", description: `${allData.length} clientes exportados.` });
    } catch (err: any) {
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Upload className="h-5 w-5 mr-2" />
            Importar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Aceita arquivos <strong>CSV</strong> (separados por vírgula ou ponto-e-vírgula).</p>
              <p>O arquivo deve conter pelo menos as colunas <strong>Nome</strong> e <strong>Telefone</strong>.</p>
              <p>Colunas opcionais: <strong>Email</strong>, <strong>Data de Nascimento</strong> (DD/MM/AAAA).</p>
              <p>Clientes com telefone duplicado serão ignorados automaticamente.</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            variant="outline"
            className="w-full"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            {importing ? "Importando..." : "Selecionar arquivo CSV"}
          </Button>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
            </div>
          )}

          {previewData && !importing && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Prévia ({totalRows} registros válidos encontrados):</p>
              <div className="space-y-0.5 bg-secondary/30 rounded p-2">
                {previewData.map((r, i) => (
                  <p key={i}>{r.name} — {r.phone}{r.email ? ` — ${r.email}` : ""}</p>
                ))}
                {totalRows > 5 && <p className="text-muted-foreground/60">...e mais {totalRows - 5}</p>}
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Resultado da importação</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="default" className="bg-emerald-600">{result.imported} importados</Badge>
                <Badge variant="secondary">{result.skipped} já existiam</Badge>
                {result.failed > 0 && (
                  <Badge variant="destructive">{result.failed} falharam</Badge>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1 mt-2 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /> {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Download className="h-5 w-5 mr-2" />
            Exportar Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe todos os clientes da sua barbearia em formato CSV.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
