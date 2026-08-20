import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, type DragEvent } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { mockStudents } from "@/data/mockData";
import { StudentTable } from "@/components/tables/StudentTable";

export const Route = createFileRoute("/admin/upload-excel")({
  component: UploadExcel,
});

function UploadExcel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const startUpload = (f: File) => {
    setFile(f);
    setProgress(0);
    setUploaded(false);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setUploaded(true);
          toast.success(`${f.name} processed — ${mockStudents.length} records ready to import.`);
          return 100;
        }
        return p + 10;
      });
    }, 120);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) startUpload(f);
  };

  return (
    <>
      <PageHeader title="Upload Results (Excel)" subtitle="Bulk import student results from an Excel sheet." />

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
            <p className="mt-1 text-sm text-muted-foreground">Supports .xlsx and .csv up to 10MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])}
            />
            <Button className="mt-4" onClick={() => inputRef.current?.click()}>Choose File</Button>
          </div>

          {file && (
            <div className="mt-6 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {uploaded ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Button size="icon" variant="ghost" onClick={() => { setFile(null); setProgress(0); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Progress value={progress} className="mt-3 h-2" />
              <p className="mt-1 text-xs text-muted-foreground">{progress}% {uploaded ? "completed" : "uploading…"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {uploaded && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Preview ({mockStudents.length} records)</h2>
          <StudentTable students={mockStudents.slice(0, 6)} />
        </div>
      )}
    </>
  );
}
