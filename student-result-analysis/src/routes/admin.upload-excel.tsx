import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, type DragEvent } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { adminService, type ImportUploadResponse } from "@/services/adminService";
import { getApiErrorItems, getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/upload-excel")({
  component: UploadExcel,
});

const MAX_BYTES = 10 * 1024 * 1024;

function UploadExcel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportUploadResponse | null>(null);
  const [rowErrors, setRowErrors] = useState<Array<{ row?: number; usn?: string | null; subject?: string | null; error: string }>>([]);
  const [dragOver, setDragOver] = useState(false);

  const selectFile = (f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xlsm") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      toast.error("Choose an Excel file (.xlsx).");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be 10MB or smaller.");
      return;
    }
    setFile(f);
    setProgress(0);
    setResult(null);
    setRowErrors([]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setResult(null);
    setRowErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSubmit = async () => {
    if (!file) {
      toast.error("Choose an Excel file first.");
      return;
    }
    setSubmitting(true);
    setProgress(0);
    setResult(null);
    setRowErrors([]);
    try {
      const data = await adminService.uploadExcel(file, setProgress);
      setProgress(100);
      setResult(data);
      toast.success(
        `Imported ${data.students_upserted} students, ${data.subjects_upserted} subjects, ${data.marks_upserted} mark rows, ${data.results_upserted} results.`,
      );
    } catch (error) {
      setProgress(0);
      setRowErrors(getApiErrorItems(error));
      toast.error(getApiErrorMessage(error, "Excel import failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Upload Results (Excel)" subtitle="Select the result sheet, then submit to import marks and calculated results." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="mt-4 font-medium">Drag & drop your Excel file here</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the Data Entry sheet (.xlsx) up to 10MB. Import starts only after Submit.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls,.csv"
              hidden
              onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])}
            />
            <Button type="button" className="mt-4" variant="outline" onClick={() => inputRef.current?.click()}>
              Choose File
            </Button>
          </div>

          {file && (
            <div className="mt-6 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || "Excel workbook"}
                  </p>
                </div>
                {result ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Button size="icon" variant="ghost" disabled={submitting} onClick={clearFile}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {(submitting || result) && (
                <>
                  <Progress value={progress} className="mt-3 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {progress}% {result ? "completed" : submitting ? "uploading…" : ""}
                  </p>
                </>
              )}
              <div className="mt-4 flex gap-2">
                <Button type="button" onClick={onSubmit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit / Upload"}
                </Button>
                <Button type="button" variant="outline" disabled={submitting} onClick={clearFile}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {rowErrors.length > 0 && (
        <Card className="mt-6 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Import rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">Nothing was saved. Fix these rows and submit again.</p>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowErrors.map((item, i) => (
                    <TableRow key={`${item.row}-${item.usn}-${item.subject}-${i}`}>
                      <TableCell>{item.row ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.usn ?? "—"}</TableCell>
                      <TableCell>{item.subject ?? "—"}</TableCell>
                      <TableCell>{item.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{result.students_upserted} students</Badge>
            <Badge variant="secondary">{result.subjects_upserted} subjects</Badge>
            <Badge variant="secondary">{result.marks_upserted} mark rows</Badge>
            <Badge variant="secondary">{result.results_upserted} results</Badge>
            <Badge variant="outline">{result.department} · Sem {result.semester}</Badge>
            {result.academic_year && <Badge variant="outline">{result.academic_year}</Badge>}
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Imported from {result.sheet_name} ({result.students.length} students)
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>USN</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">SGPA</TableHead>
                  <TableHead className="text-right">CGPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.students.map((s) => (
                  <TableRow key={s.usn}>
                    <TableCell className="font-mono text-xs">{s.usn}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.grand_total}</TableCell>
                    <TableCell className="text-right">{s.average_marks}</TableCell>
                    <TableCell className="text-right">{s.sgpa.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{s.cgpa.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
