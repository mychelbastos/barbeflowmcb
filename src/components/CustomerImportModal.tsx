import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  X,
} from "lucide-react";

type Step = "upload" | "mapping" | "preview" | "processing" | "result";

interface MappedRow {
  name: string;
  phone: string;
  email: string;
  birthday: string;
  gender: string;
  cpf: string;
  registered_at: string;
  notes: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
}

const SYSTEM_FIELDS = [
  { value: "ignore", label: "Ignorar" },
  { value: "name", label: "Nome" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "birthday", label: "Aniversário" },
  { value: "gender", label: "Gênero" },
  { value: "cpf", label: "CPF" },
  { value: "registered_at", label: "Data de cadastro" },
  { value: "notes", label: "Notas" },
];

const AUTO_MAP: Record<string, string> = {
  cliente: "name",
  nome: "name",
  name: "name",
  celular: "phone",
  telefone: "phone",
  phone: "phone",
  fone: "phone",
  whatsapp: "phone",
  "e-mail": "email",
  email: "email",
  aniversario: "birthday",
  "aniversário": "birthday",
  nascimento: "birthday",
  birthday: "birthday",
  sexo: "gender",
  genero: "gender",
  "gênero": "gender",
  gender: "gender",
  cpf: "cpf",
  cadastrado: "registered_at",
  "data cadastro": "registered_at",
  obs: "notes",
  observacao: "notes",
  "observação": "notes",
  notas: "notes",
};

function normalizePhone(phone: string): string {
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + "9" + digits.slice(2);
  return digits;
}

function autoMapColumn(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/[_\-]/g, " ");
  for (const [key, value] of Object.entries(AUTO_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return "ignore";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function CustomerImportModal({ open, onOpenChange, onComplete }: Props) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [enrichMode, setEnrichMode] = useState<"enrich" | "skip">("enrich");
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep("upload");
    setRawHeaders([]);
    setRawData([]);
    setColumnMap({});
    setMappedRows([]);
    setWarnings([]);
    setValidCount(0);
    setProgress(0);
    setResult(null);
    setEnrichMode("enrich");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const processFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (json.length === 0) {
        toast({ title: "Arquivo vazio", description: "O arquivo não contém dados.", variant: "destructive" });
        return;
      }

      const headers = Object.keys(json[0]);
      const mapping: Record<string, string> = {};
      headers.forEach((h) => {
        mapping[h] = autoMapColumn(h);
      });

      setRawHeaders(headers);
      setRawData(json);
      setColumnMap(mapping);
      setStep("mapping");
    } catch (err: any) {
      toast({ title: "Erro ao ler arquivo", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleProceedToPreview = () => {
    const nameCol = Object.entries(columnMap).find(([, v]) => v === "name")?.[0];
    const phoneCol = Object.entries(columnMap).find(([, v]) => v === "phone")?.[0];

    if (!nameCol || !phoneCol) {
      toast({ title: "Mapeamento obrigatório", description: "Nome e Telefone são obrigatórios.", variant: "destructive" });
      return;
    }

    const rows: MappedRow[] = [];
    const warns: string[] = [];
    const seenPhones = new Set<string>();
    let noPhone = 0;
    let dupInFile = 0;

    rawData.forEach((row) => {
      const mapped: MappedRow = {
        name: "",
        phone: "",
        email: "",
        birthday: "",
        gender: "",
        cpf: "",
        registered_at: "",
        notes: "",
      };

      Object.entries(columnMap).forEach(([header, field]) => {
        if (field !== "ignore") {
          (mapped as any)[field] = String(row[header] ?? "").trim();
        }
      });

      if (!mapped.name) return;

      const phone = normalizePhone(mapped.phone);
      if (phone.length < 10) {
        noPhone++;
        return;
      }

      if (seenPhones.has(phone)) {
        dupInFile++;
        return;
      }
      seenPhones.add(phone);

      mapped.phone = phone;
      rows.push(mapped);
    });

    if (noPhone > 0) warns.push(`${noPhone} registros sem telefone válido serão ignorados`);
    if (dupInFile > 0) warns.push(`${dupInFile} telefones duplicados no arquivo (será mantido o primeiro)`);

    setMappedRows(rows);
    setWarnings(warns);
    setValidCount(rows.length);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!currentTenant) return;
    setStep("processing");
    setProgress(0);

    const BATCH_SIZE = 100;
    const totalResult: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: 0 };

    for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
      const batch = mappedRows.slice(i, i + BATCH_SIZE);
      
      try {
        const { data, error } = await supabase.rpc("import_customers_batch", {
          p_tenant_id: currentTenant.id,
          p_customers: batch as any,
        });

        if (error) {
          console.error("RPC error:", error);
          totalResult.errors += batch.length;
        } else if (data) {
          const d = data as any;
          if (d.success) {
            totalResult.imported += d.imported || 0;
            totalResult.updated += d.updated || 0;
            totalResult.skipped += d.skipped || 0;
            totalResult.errors += d.errors || 0;
          }
        }
      } catch (err) {
        console.error("Batch error:", err);
        totalResult.errors += batch.length;
      }

      setProgress(Math.round(((i + batch.length) / mappedRows.length) * 100));
    }

    setProgress(100);
    setResult(totalResult);
    setStep("result");
  };

  const getGenderLabel = (g: string) => {
    if (g === "M") return "M";
    if (g === "F") return "F";
    if (g) return "O";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Clientes
          </DialogTitle>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arraste um arquivo Excel (.xlsx) ou CSV aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-3">Formatos aceitos: .xlsx, .xls, .csv</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* STEP: Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Encontramos <strong>{rawHeaders.length}</strong> colunas e <strong>{rawData.length}</strong> linhas. Mapeie as colunas para os campos do sistema:
            </p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {rawHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-[140px] truncate" title={header}>
                    "{header}"
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={columnMap[header] || "ignore"}
                    onValueChange={(val) => setColumnMap((prev) => ({ ...prev, [header]: val }))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleProceedToPreview}>
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview (mostrando {Math.min(5, mappedRows.length)} de {validCount}):
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Gênero</TableHead>
                    <TableHead>Aniversário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.name}</TableCell>
                      <TableCell className="text-xs">{row.phone}</TableCell>
                      <TableCell className="text-xs">{getGenderLabel(row.gender)}</TableCell>
                      <TableCell className="text-xs">{row.birthday}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {warnings.length > 0 && (
              <div className="space-y-1">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Comportamento para clientes já existentes:</p>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" name="enrichMode" checked={enrichMode === "enrich"} onChange={() => setEnrichMode("enrich")} className="accent-primary" />
                  <span>Enriquecer dados faltantes <span className="text-muted-foreground">(recomendado)</span></span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" name="enrichMode" checked={enrichMode === "skip"} onChange={() => setEnrichMode("skip")} className="accent-primary" />
                  <span>Ignorar (não alterar)</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={handleImport}>
                Importar {validCount.toLocaleString()} clientes
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: Processing */}
        {step === "processing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Importando clientes...</p>
            <Progress value={progress} className="h-2 max-w-xs mx-auto" />
            <p className="text-xs text-muted-foreground">{progress}% concluído</p>
          </div>
        )}

        {/* STEP: Result */}
        {step === "result" && result && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-lg font-semibold">Importação concluída!</h3>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">📊 Resumo:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Novos clientes importados:</span>
                <span className="font-semibold text-right">{result.imported}</span>
                <span className="text-muted-foreground">Clientes enriquecidos:</span>
                <span className="font-semibold text-right">{result.updated}</span>
                <span className="text-muted-foreground">Já existentes (sem alteração):</span>
                <span className="font-semibold text-right">{result.skipped}</span>
                {result.errors > 0 && (
                  <>
                    <span className="text-muted-foreground">Erros:</span>
                    <span className="font-semibold text-right text-destructive">{result.errors}</span>
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => { handleClose(); onComplete(); }}>
                Ver clientes importados
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
