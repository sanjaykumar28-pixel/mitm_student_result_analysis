import { useEffect, useState } from "react";
import { FileText, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminService,
  type AdminResultDetailResponse,
  type AdminResultRow,
  type AdminResultSemester,
  type AdminResultSubject,
} from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";
import { toast } from "sonner";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(digits);
}

function CgpaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  const num = Number(value);
  let colorClass = "bg-primary/10 text-primary border border-primary/20";
  if (num >= 9)
    colorClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
  else if (num >= 8)
    colorClass = "bg-blue-50 text-blue-700 border border-blue-200";
  else if (num >= 7)
    colorClass = "bg-amber-50 text-amber-700 border border-amber-200";
  else colorClass = "bg-red-50 text-red-600 border border-red-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {num.toFixed(2)}
    </span>
  );
}

// ── Standalone Print Component (Outside Portal so browser print works 100%) ──
function AdminPrintCard({ row, detail }: { row: AdminResultRow; detail: AdminResultSemester }) {
  const displaySubjects = detail.subjects;
  const totalCreditsReg = displaySubjects.reduce((sum, subject) => sum + (subject.credits ?? 0), 0);
  const totalCreditsEar = detail.total_credits;

  return (
    <div id="admin-print-card" className="hidden print:block text-black bg-white">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wide">Maharaja Institute of Technology Mysore</h1>
        <p className="text-xs md:text-sm font-semibold mt-1">An Autonomous Institution Affiliated to VTU</p>
        <h2 className="text-base font-bold mt-3 underline underline-offset-4 decoration-2">Provisional Grade Card</h2>
        <p className="text-xs font-medium mt-1">Semester {row.semester} Examination</p>
      </div>

      {/* Aligned Student Info */}
      <div className="space-y-1.5 mb-6 text-xs font-semibold border-b pb-4 border-black/30">
        <div className="grid grid-cols-[110px_16px_1fr] items-center">
          <span>USN</span>
          <span>:</span>
          <span className="uppercase font-mono">{row.usn}</span>
        </div>
        <div className="grid grid-cols-[110px_16px_1fr] items-center">
          <span>Semester</span>
          <span>:</span>
          <span>Semester {row.semester}</span>
        </div>
        <div className="grid grid-cols-[110px_16px_1fr] items-center">
          <span>NAME</span>
          <span>:</span>
          <span className="uppercase">{row.student_name}</span>
        </div>
        <div className="grid grid-cols-[110px_16px_1fr] items-center">
          <span>Branch</span>
          <span>:</span>
          <span className="uppercase">{row.department}</span>
        </div>
        <div className="grid grid-cols-[110px_16px_1fr] items-center">
          <span>Program</span>
          <span>:</span>
          <span className="uppercase">M.C.A</span>
        </div>
      </div>

      {/* Table */}
      <div className="mb-5">
        <table className="w-full text-xs border-collapse border border-black table-fixed">
          <thead>
            <tr className="bg-gray-100/80">
              <th className="border border-black p-2 text-center font-bold w-[6%]">S.No</th>
              <th className="border border-black p-2 text-center font-bold w-[13%]">Course Code</th>
              <th className="border border-black p-2 text-left font-bold w-[24%]">Course Name</th>
              <th className="border border-black p-2 text-center font-bold w-[6%]">CIE</th>
              <th className="border border-black p-2 text-center font-bold w-[6%]">SEE</th>
              <th className="border border-black p-2 text-center font-bold w-[7%]">Total</th>
              <th className="border border-black p-2 text-center font-bold w-[9%]">Grade Point</th>
              <th className="border border-black p-2 text-center font-bold w-[7%]">Grade</th>
              <th className="border border-black p-2 text-center font-bold w-[11%]">Credits Reg.</th>
              <th className="border border-black p-2 text-center font-bold w-[11%]">Credits Ear.</th>
            </tr>
          </thead>
          <tbody>
            {displaySubjects.map((subject, idx) => {
              const credReg = subject.credits ?? null;
              const credEar = subject.grade !== "F" ? credReg : 0;

              return (
                <tr key={subject.subject_code + idx}>
                  <td className="border border-black p-2 text-center">{idx + 1}</td>
                  <td className="border border-black p-2 text-center font-mono">{subject.subject_code}</td>
                  <td className="border border-black p-2 text-left uppercase break-words leading-tight">{subject.subject_name}</td>
                  <td className="border border-black p-2 text-center">{subject.internal_marks ?? "—"}</td>
                  <td className="border border-black p-2 text-center">{subject.external_marks ?? "—"}</td>
                  <td className="border border-black p-2 text-center">{subject.total_marks ?? "—"}</td>
                  <td className="border border-black p-2 text-center">{subject.grade_point ?? "—"}</td>
                  <td className="border border-black p-2 text-center font-bold">{subject.grade ?? "—"}</td>
                  <td className="border border-black p-2 text-center">{credReg}</td>
                  <td className="border border-black p-2 text-center">{credEar}</td>
                </tr>
              );
            })}
            {/* Total Row */}
            <tr className="font-bold">
              <td className="border border-black p-2 text-center" colSpan={8}>Total</td>
              <td className="border border-black p-2 text-center">{totalCreditsReg}</td>
              <td className="border border-black p-2 text-center">{totalCreditsEar}</td>
            </tr>
            {/* SGPA Row */}
            <tr className="font-bold">
              <td className="border border-black p-1.5 text-center" colSpan={8}>SGPA</td>
              <td className="border border-black p-1.5 text-center" colSpan={2}>
                {detail.sgpa != null ? Number(detail.sgpa).toFixed(2) : "—"}
              </td>
            </tr>
            {/* CGPA Row */}
            <tr className="font-bold">
              <td className="border border-black p-1.5 text-center" colSpan={8}>CGPA</td>
              <td className="border border-black p-1.5 text-center" colSpan={2}>
                {detail.cgpa != null ? Number(detail.cgpa).toFixed(2) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total Points / SGPA / CGPA Summary Line */}
      <div className="flex justify-end gap-8 text-xs font-bold my-5 py-2.5 border-y border-black/40">
        <div>Total Points : <span className="font-mono font-normal">{detail.total_points.toFixed(2)}</span></div>
        <div>SGPA : <span className="font-mono font-normal">{detail.sgpa != null ? Number(detail.sgpa).toFixed(2) : "—"}</span></div>
        <div>CGPA : <span className="font-mono font-normal">{detail.cgpa != null ? Number(detail.cgpa).toFixed(2) : "—"}</span></div>
      </div>

      {/* Footer Signatures */}
      <div className="flex justify-between items-end mt-8 mb-4 font-semibold text-xs">
        <div>
          Date: {new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}
        </div>
        <div className="text-right">
          Controller of Examinations
        </div>
      </div>

      <hr className="border-black mb-2" />
      <p className="text-[10px] text-justify font-medium leading-tight">
        <span className="font-bold">Note:</span> These are provisional results. The final official results will be provided by the university/institution. Any discrepancies should be reported to the Controller of Examinations immediately.
      </p>
    </div>
  );
}

// ── Result Sheet Modal ────────────────────────────────────────────────────────
function ResultSheetModal({
  row,
  detail,
  selectedSemester,
  onSemesterChange,
  loading,
  error,
  open,
  onClose,
}: {
  row: AdminResultRow | null;
  detail: AdminResultDetailResponse | null;
  selectedSemester: number | null;
  onSemesterChange: (semester: number) => void;
  loading: boolean;
  error: string | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;
  const selectedDetail = detail?.semesters.find((item) => item.semester === selectedSemester) ?? null;
  const displaySubjects: AdminResultSubject[] = selectedDetail?.subjects ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl xl:max-w-[1200px] w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
        {/* ── ON-SCREEN MODAL VIEW ── */}
        <div className="print:hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Maharaja Institute of Technology Mysore
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Department of Computer Applications · Provisional Grade Card
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-6">
            {/* Student Info Card */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary select-none shrink-0">
                  {row.student_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground uppercase tracking-wide leading-tight">
                    {row.student_name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 font-mono font-medium">
                    {row.usn}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Department</span>
                  <span className="font-semibold text-foreground">: {row.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">Semester</span>
                  <select
                    aria-label="Select semester"
                    className="rounded-md border bg-background px-2 py-1 font-semibold text-foreground"
                    value={selectedSemester ?? ""}
                    onChange={(event) => onSemesterChange(Number(event.target.value))}
                    disabled={loading || !detail}
                  >
                    {detail?.semesters.map((item) => (
                      <option key={item.semester} value={item.semester}>Semester {item.semester}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-24">CGPA</span>
                  <span className="font-semibold text-foreground">: {selectedDetail?.cgpa != null ? Number(selectedDetail.cgpa).toFixed(2) : "—"}</span>
                </div>
              </div>
            </div>

            {/* Subject-wise Results */}
            <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="bg-muted/30 px-5 py-4 border-b">
                <h3 className="text-base font-bold text-foreground">
                  Subject-wise Results (Semester {selectedDetail?.semester ?? row.semester})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10">
                        {["Subject Code", "Subject Name", "Credit", "Grade", "CIE Marks (50)", "SEE Marks (50)", "Total (100)", "Grade Point"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">Loading result details...</td></tr>
                    ) : error ? (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-destructive">{error}</td></tr>
                    ) : displaySubjects.length === 0 ? (
                      <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No subjects found for this semester.</td></tr>
                    ) : displaySubjects.map((subject, idx) => {
                      return (
                        <tr key={subject.subject_code + idx} className="hover:bg-muted/5 transition-colors">
                          <td className="px-5 py-3 font-mono text-foreground">{subject.subject_code}</td>
                          <td className="px-5 py-3 text-foreground whitespace-normal min-w-[200px]">{subject.subject_name}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{subject.credits ?? "—"}</td>
                          <td className="px-5 py-3 font-bold text-primary">{subject.grade ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{subject.internal_marks ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{subject.external_marks ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums font-semibold text-foreground">{subject.total_marks ?? "—"}</td>
                          <td className="px-5 py-3 tabular-nums text-muted-foreground">{subject.grade_point ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Summary Statistics */}
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Credits", value: selectedDetail?.total_credits ?? "—" },
                  { label: "Total Points", value: selectedDetail?.total_points.toFixed(2) ?? "—" },
                  { label: "SGPA", value: selectedDetail?.sgpa != null ? Number(selectedDetail.sgpa).toFixed(2) : "—" },
                  { label: "CGPA", value: selectedDetail?.cgpa != null ? Number(selectedDetail.cgpa).toFixed(2) : "—" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border bg-card p-4 shadow-sm flex flex-col items-center justify-center text-center"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer / Controls */}
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>
                Generated: {new Date().toLocaleDateString("en-GB")} · Provisional result only
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 rounded-md text-white bg-primary hover:bg-primary/90"
                >
                  <Printer className="h-4 w-4" />
                  Print Result
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main table component ──────────────────────────────────────────────────────

interface ViewResultsTableProps {
  results: AdminResultRow[];
  onDeleted?: (resultId: number) => void; // kept for interface compat but unused
}

export function ViewResultsTable({ results }: ViewResultsTableProps) {
  const [viewTarget, setViewTarget] = useState<AdminResultRow | null>(null);
  const [detail, setDetail] = useState<AdminResultDetailResponse | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewTarget) {
      setDetail(null);
      setSelectedSemester(null);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    adminService.getResultDetails(viewTarget.usn)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setSelectedSemester(data.semesters.some((item) => item.semester === viewTarget.semester)
          ? viewTarget.semester
          : data.semesters[0]?.semester ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = getApiErrorMessage(error, "Could not load this student's result.");
        setDetailError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewTarget]);

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-foreground">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No stored results match your filters. Try adjusting the search or
          department filter.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html, body {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          body * {
            visibility: hidden !important;
          }

          #admin-print-card,
          #admin-print-card * {
            visibility: visible !important;
          }

          #admin-print-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
            font-size: 12px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
          }

          #admin-print-card tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16">
                  S.No
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Department
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sem
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  SGPA
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CGPA
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((row, index) => (
                <tr
                  key={row.result_id}
                  className="group transition-colors hover:bg-muted/30"
                >
                  {/* S.No */}
                  <td className="px-4 py-3.5 text-center text-muted-foreground font-medium text-xs w-16">
                    {index + 1}
                  </td>

                  {/* USN */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-medium text-primary bg-primary/8 rounded-md px-1.5 py-0.5 border border-primary/15">
                      {row.usn}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary select-none">
                        {row.student_name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {row.student_name}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden truncate">
                          {row.department}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <Badge variant="secondary" className="font-normal whitespace-nowrap">
                      {row.department}
                    </Badge>
                  </td>

                  {/* Semester */}
                  <td className="px-4 py-3.5 text-center">
                    <span className="tabular-nums text-foreground font-medium">
                      {row.semester}
                    </span>
                  </td>

                  {/* SGPA */}
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <span className="tabular-nums text-muted-foreground">
                      {fmt(row.sgpa)}
                    </span>
                  </td>

                  {/* CGPA */}
                  <td className="px-4 py-3.5 text-center">
                    <CgpaBadge value={row.cgpa} />
                  </td>

                  {/* View More */}
                  <td className="px-4 py-3.5 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        setDetail(null);
                        setSelectedSemester(row.semester);
                        setViewTarget(row);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View More
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Sheet Modal */}
      <ResultSheetModal
        row={viewTarget}
        detail={detail}
        selectedSemester={selectedSemester}
        onSemesterChange={setSelectedSemester}
        loading={detailLoading}
        error={detailError}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
      />

      {/* Standalone Print Component (Rendered directly in page DOM tree, outside Radix Portal) */}
      {viewTarget && detail && selectedSemester !== null && (
        <AdminPrintCard
          row={viewTarget}
          detail={detail.semesters.find((item) => item.semester === selectedSemester) ?? detail.semesters[0]}
        />
      )}
    </>
  );
}
