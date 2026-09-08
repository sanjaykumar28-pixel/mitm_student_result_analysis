import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, type DragEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { departments } from "@/data/mockData";
import { adminService, type ImportUploadResponse } from "@/services/adminService";
import { getApiErrorItems, getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/add-student")({
  component: AddStudent,
});

// ── Manual form schema ─────────────────────────────────────────────────────────
const schema = z.object({
  studentId: z
    .string()
    .trim()
    .min(1, "USN required")
    .regex(/^\d[A-Za-z]{2}\d{2}[A-Za-z]{2,4}\d{3}$/, "USN must match the format 4MH24MC001"),
  name: z.string().trim().min(2, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  department: z.string().min(1, "Department required"),
  semester: z.string().min(1, "Semester required"),
  // NOTE: gender is collected in the UI but the current backend /admin/students
  // endpoint does not accept a gender field. The backend must be updated to
  // add a gender column before it can be persisted in the database.
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender required" }),
  password: z.string().min(6, "Password must be at least 6 characters").max(64),
});
type FormValues = z.infer<typeof schema>;

// ── Excel upload file-size limit (mirrors admin.upload-excel.tsx) ──────────────
const MAX_BYTES = 10 * 1024 * 1024;

function AddStudent() {
  // ── Manual form state ────────────────────────────────────────────────────────
  const [addedStudents, setAddedStudents] = useState<any[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const created = await adminService.addStudent({
        usn: data.studentId,
        name: data.name,
        email: data.email,
        department: data.department,
        semester: Number(data.semester),
        password: data.password,
        // gender omitted: backend /admin/students does not support it yet.
      });
      toast.success(`${created.name} (${created.usn}) can now sign in as a student.`);
      setAddedStudents((prev) => [
        {
          usn: data.studentId,
          name: data.name,
          email: data.email,
          department: data.department,
          semester: data.semester,
          gender: data.gender,
        },
        ...prev,
      ]);
      reset();
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not add student.");
      if (message.toLowerCase().includes("usn already exists")) {
        setError("studentId", { type: "server", message });
      } else if (message.toLowerCase().includes("email already exists")) {
        setError("email", { type: "server", message });
      }
      toast.error(message);
    }
  };

  // ── Excel upload state (reuses adminService.uploadExcel exactly as admin.upload-excel.tsx) ──
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelProgress, setExcelProgress] = useState(0);
  const [excelSubmitting, setExcelSubmitting] = useState(false);
  const [excelResult, setExcelResult] = useState<ImportUploadResponse | null>(null);
  const [excelRowErrors, setExcelRowErrors] = useState<
    Array<{ row?: number; usn?: string | null; subject?: string | null; error: string }>
  >([]);
  const [dragOver, setDragOver] = useState(false);

  const selectExcelFile = (f: File) => {
    const name = f.name.toLowerCase();
    if (
      !name.endsWith(".xlsx") &&
      !name.endsWith(".xlsm") &&
      !name.endsWith(".xls") &&
      !name.endsWith(".csv")
    ) {
      toast.error("Choose an Excel file (.xlsx).");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be 10 MB or smaller.");
      return;
    }
    setExcelFile(f);
    setExcelProgress(0);
    setExcelResult(null);
    setExcelRowErrors([]);
  };

  const onExcelDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) selectExcelFile(f);
  };

  const clearExcelFile = () => {
    setExcelFile(null);
    setExcelProgress(0);
    setExcelResult(null);
    setExcelRowErrors([]);
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const onExcelSubmit = async () => {
    if (!excelFile) {
      toast.error("Choose an Excel file first.");
      return;
    }
    setExcelSubmitting(true);
    setExcelProgress(0);
    setExcelResult(null);
    setExcelRowErrors([]);
    try {
      const data = await adminService.uploadExcel(excelFile, setExcelProgress);
      setExcelProgress(100);
      setExcelResult(data);
      toast.success(
        `Imported ${data.students_upserted} students and ${data.marks_upserted} mark rows. Credits were read from the Subjects table.`,
      );
    } catch (error) {
      setExcelProgress(0);
      setExcelRowErrors(getApiErrorItems(error));
      toast.error(getApiErrorMessage(error, "Excel import failed."));
    } finally {
      setExcelSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Add Student" subtitle="Create a new student account or bulk-import via Excel." />

      {/* ── 1. Manual Add Student ─────────────────────────────────────────── */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Student ID / USN */}
            <div className="space-y-1.5">
              <Label htmlFor="studentId">Student ID / USN</Label>
              <Input id="studentId" placeholder="4MH24MC001" {...register("studentId")} />
              {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email — full width */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@gmail.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={watch("department")}
                onValueChange={(v) => setValue("department", v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
            </div>

            {/* Semester */}
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select
                value={watch("semester")}
                onValueChange={(v) => setValue("semester", v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.semester && <p className="text-xs text-destructive">{errors.semester.message}</p>}
            </div>

            {/* Gender — NEW FIELD
                NOTE: Gender is validated and shown in the session Student List below,
                but is NOT sent to the backend API (/admin/students) because the current
                backend does not have a gender column. Update the backend to persist it. */}
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={watch("gender")}
                onValueChange={(v) =>
                  setValue("gender", v as "Male" | "Female" | "Other", { shouldValidate: true })
                }
              >
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>

            {/* Initial Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Initial Password</Label>
              <Input id="password" type="password" placeholder="Min 6 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Add Student"}
              </Button>
              <Button type="button" variant="outline" onClick={() => reset()}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── 2. Excel Bulk Upload ──────────────────────────────────────────── */}
      <Card className="mt-6 max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Upload Excel Sheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an Excel file with student details. The data will be added to the system automatically.
          </p>

          {/* Drag-and-drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onExcelDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="mt-4 font-medium">Drag &amp; drop your Excel file here</p>
            <p className="mt-1 text-sm text-muted-foreground">.xlsx / .xls / .csv — up to 10 MB</p>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls,.csv"
              hidden
              onChange={(e) => e.target.files?.[0] && selectExcelFile(e.target.files[0])}
            />
            <Button
              type="button"
              className="mt-4"
              variant="outline"
              onClick={() => excelInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>

          {/* Information note */}
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            The Excel file will be processed and students will be added to the system automatically.
            Make sure your file follows the required format.
          </p>

          {/* Selected file card */}
          {excelFile && (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{excelFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(excelFile.size / 1024).toFixed(1)} KB · {excelFile.type || "Excel workbook"}
                  </p>
                </div>
                {excelResult ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Button size="icon" variant="ghost" disabled={excelSubmitting} onClick={clearExcelFile}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {(excelSubmitting || excelResult) && (
                <>
                  <Progress value={excelProgress} className="mt-3 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {excelProgress}%{" "}
                    {excelResult ? "completed" : excelSubmitting ? "uploading…" : ""}
                  </p>
                </>
              )}

              <div className="mt-4 flex gap-2">
                <Button type="button" onClick={onExcelSubmit} disabled={excelSubmitting}>
                  {excelSubmitting ? "Submitting…" : "Submit / Upload"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={excelSubmitting}
                  onClick={clearExcelFile}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Row-level import errors */}
          {excelRowErrors.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-card">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold text-destructive">Import rejected</p>
                <p className="text-xs text-muted-foreground">
                  Nothing was saved. Fix these rows and submit again.
                </p>
              </div>
              <div className="overflow-x-auto">
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
                    {excelRowErrors.map((item, i) => (
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
            </div>
          )}

          {/* Success summary table */}
          {excelResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{excelResult.students_upserted} students</Badge>
                <Badge variant="secondary">{excelResult.subjects_upserted} subjects</Badge>
                <Badge variant="secondary">{excelResult.marks_upserted} mark rows</Badge>
                <Badge variant="secondary">{excelResult.results_upserted} results</Badge>
                <Badge variant="secondary">
                  {excelResult.students.reduce((sum, s) => sum + s.credits_registered, 0)} credits registered
                </Badge>
                <Badge variant="secondary">
                  {excelResult.students.reduce((sum, s) => sum + s.credits_earned, 0)} credits earned
                </Badge>
                <Badge variant="outline">{excelResult.department} · Sem {excelResult.semester}</Badge>
                {excelResult.academic_year && (
                  <Badge variant="outline">{excelResult.academic_year}</Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                Imported from {excelResult.sheet_name} ({excelResult.students.length} students)
              </p>
              <div className="overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>USN</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">SGPA</TableHead>
                      <TableHead className="text-right">CGPA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelResult.students.map((s) => (
                      <TableRow key={s.usn}>
                        <TableCell className="font-mono text-xs">{s.usn}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.grand_total}</TableCell>
                        <TableCell className="text-right">{s.average_marks}</TableCell>
                        <TableCell className="text-right">{s.credits_earned}/{s.credits_registered}</TableCell>
                        <TableCell className="text-right">{s.sgpa.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{s.cgpa.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. In-session Student List ────────────────────────────────────── */}
      <div className="mt-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student List</CardTitle>
          </CardHeader>
          <CardContent>
            {addedStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students added yet.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="h-10 px-4 text-left font-medium">#</th>
                      <th className="h-10 px-4 text-left font-medium">Student ID</th>
                      <th className="h-10 px-4 text-left font-medium">Full Name</th>
                      <th className="h-10 px-4 text-left font-medium">Email</th>
                      <th className="h-10 px-4 text-left font-medium">Department</th>
                      <th className="h-10 px-4 text-left font-medium">Semester</th>
                      <th className="h-10 px-4 text-left font-medium">Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedStudents.map((student, index) => (
                      <tr
                        key={index}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4 align-middle">{index + 1}</td>
                        <td className="p-4 align-middle font-medium">{student.usn}</td>
                        <td className="p-4 align-middle">{student.name}</td>
                        <td className="p-4 align-middle text-muted-foreground">{student.email}</td>
                        <td className="p-4 align-middle">{student.department}</td>
                        <td className="p-4 align-middle">{student.semester}</td>
                        <td className="p-4 align-middle">{student.gender}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
