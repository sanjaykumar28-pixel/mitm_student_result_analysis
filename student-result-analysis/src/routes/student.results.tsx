import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { gradePoint, type Grade } from "@/data/mockData";
import { toast } from "sonner";
import { studentService, type StudentSemesterResult, type StudentDashboardResponse } from "@/services/studentService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/student/results")({
  component: StudentResults,
});

function StudentResults() {
  const [semesters, setSemesters] = useState<StudentSemesterResult[]>([]);
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [sem, setSem] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      studentService.getResults(),
      studentService.getDashboard()
    ])
      .then(([resData, dashData]) => {
        if (cancelled) return;
        setSemesters(resData.semesters);
        setDashboard(dashData);
        setSem(resData.semesters.length ? resData.semesters[resData.semesters.length - 1].semester : null);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSemesters([]);
        setDashboard(null);
        setSem(null);
        setError(getApiErrorMessage(err, "Could not load your results."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const semData = useMemo(
    () => (sem == null ? undefined : semesters.find((s) => s.semester === sem)),
    [sem, semesters],
  );

  const subjects = semData ? semData.subjects : [];
  const totalCreditsReg = subjects.reduce((a, s) => a + (s.credits || 0), 0);
  const totalCreditsEar = semData?.credits_earned ?? subjects.reduce((a, s) => a + (s.grade !== 'F' ? (s.credits || 0) : 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-grade-card, #print-grade-card * {
            visibility: visible;
          }
          #print-grade-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 15mm 15mm;
            box-sizing: border-box;
            page-break-inside: avoid;
            font-size: 14px;
          }
          /* Removing margins from @page removes browser header and footer */
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
      
      <div className="print:hidden">
        <PageHeader
          title="Student Results"
          subtitle="Provisional Grade Card"
          actions={
            <div className="flex items-center gap-4">
              {semesters.length > 0 && (
                <select 
                  className="border rounded-md px-3 py-2 text-sm bg-background w-36"
                  value={sem || ""}
                  onChange={(e) => setSem(Number(e.target.value))}
                >
                  {semesters.map((s) => (
                    <option key={s.semester} value={s.semester}>Semester {s.semester}</option>
                  ))}
                </select>
              )}
              <Button variant="outline" onClick={handlePrint} disabled={!semData}>
                <Printer className="mr-2 h-4 w-4" /> Print / Export
              </Button>
            </div>
          }
        />
      </div>

      {error ? (
        <div className="p-12 text-center border rounded-xl bg-card print:hidden">
          <p className="text-sm font-medium">No results found</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      ) : semesters.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-card print:hidden">
          <p className="text-sm font-medium">No results found</p>
          <p className="mt-1 text-xs text-muted-foreground">No stored results for your account.</p>
        </div>
      ) : (
        <div id="print-grade-card" className="bg-white text-black p-6 md:p-10 max-w-5xl mx-auto border shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wide">Maharaja Institute of Technology Mysore</h1>
            <p className="text-sm md:text-base font-semibold mt-1">An Autonomous Institution Affiliated to VTU</p>
            <h2 className="text-lg md:text-xl font-bold mt-4 underline underline-offset-4 decoration-2">Provisional Grade Card</h2>
            <p className="text-sm font-medium mt-2">Semester {sem} Examination</p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 mb-6 text-sm font-semibold border-b pb-6 border-black/20">
            <div className="flex">
              <span className="w-24 shrink-0">USN</span>
              <span className="mr-2">:</span>
              <span className="uppercase">{dashboard?.usn || "—"}</span>
            </div>
            <div className="flex">
              <span className="w-36 md:w-48 shrink-0">Semester</span>
              <span className="mr-2">:</span>
              <span>Semester {sem || "—"}</span>
            </div>
            <div className="flex">
              <span className="w-24 shrink-0">NAME</span>
              <span className="mr-2">:</span>
              <span className="uppercase">{dashboard?.name || "—"}</span>
            </div>
            <div className="flex">
              <span className="w-36 md:w-48 shrink-0">Father's / Mother's Name</span>
              <span className="mr-2">:</span>
              <span>—</span>
            </div>
            <div className="flex">
              <span className="w-24 shrink-0">Branch</span>
              <span className="mr-2">:</span>
              <span className="uppercase">{dashboard?.department || "—"}</span>
            </div>
            <div className="flex">
              <span className="w-36 md:w-48 shrink-0">Program</span>
              <span className="mr-2">:</span>
              <span className="uppercase">M.C.A</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse border border-black">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="border border-black p-2 font-bold text-center w-12">S.No</th>
                  <th className="border border-black p-2 font-bold text-center w-28">Course Code</th>
                  <th className="border border-black p-2 font-bold text-left">Course Name</th>
                  <th className="border border-black p-2 font-bold text-center w-16">CIE</th>
                  <th className="border border-black p-2 font-bold text-center w-16">SEE</th>
                  <th className="border border-black p-2 font-bold text-center w-16">Total</th>
                  <th className="border border-black p-2 font-bold text-center w-20">Grade Point</th>
                  <th className="border border-black p-2 font-bold text-center w-16">Grade</th>
                  <th className="border border-black p-2 font-bold text-center w-20">Credits Reg.</th>
                  <th className="border border-black p-2 font-bold text-center w-20">Credits Ear.</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, idx) => {
                  const gp = s.grade && s.grade in gradePoint ? gradePoint[s.grade as Grade] : "—";
                  const creditsEar = s.grade !== "F" ? s.credits : 0;
                  return (
                    <tr key={s.code}>
                      <td className="border border-black p-2 text-center">{idx + 1}</td>
                      <td className="border border-black p-2 text-center font-mono">{s.code}</td>
                      <td className="border border-black p-2 text-left uppercase whitespace-pre-wrap leading-tight">{s.name}</td>
                      <td className="border border-black p-2 text-center">{s.internal_marks ?? "—"}</td>
                      <td className="border border-black p-2 text-center">{s.external_marks ?? "—"}</td>
                      <td className="border border-black p-2 text-center">{s.total_marks ?? s.marks ?? "—"}</td>
                      <td className="border border-black p-2 text-center">{gp}</td>
                      <td className="border border-black p-2 text-center font-bold">{s.grade || "—"}</td>
                      <td className="border border-black p-2 text-center">{s.credits || "—"}</td>
                      <td className="border border-black p-2 text-center">{creditsEar || "—"}</td>
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
                  <td className="border border-black p-2 text-center" colSpan={8}>SGPA</td>
                  <td className="border border-black p-2 text-center" colSpan={2}>
                    {semData?.sgpa != null ? semData.sgpa.toFixed(2) : "—"}
                  </td>
                </tr>
                {/* CGPA Row */}
                <tr className="font-bold">
                  <td className="border border-black p-2 text-center" colSpan={8}>CGPA</td>
                  <td className="border border-black p-2 text-center" colSpan={2}>
                    {semData?.cgpa != null ? semData.cgpa.toFixed(2) : (dashboard?.overall_cgpa != null ? dashboard.overall_cgpa.toFixed(2) : "—")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Dates and Sigs */}
          <div className="flex justify-between items-end mt-12 mb-6 font-semibold text-sm">
            <div>
              Date: {new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}
            </div>
            <div className="text-right">
              Controller of Examinations
            </div>
          </div>

          <hr className="border-black mb-2" />
          <p className="text-xs text-justify font-medium">
            <span className="font-bold">Note:</span> These are provisional results. The final official results will be provided by the university/institution. Any discrepancies should be reported to the Controller of Examinations immediately.
          </p>
        </div>
      )}
    </>
  );
}
