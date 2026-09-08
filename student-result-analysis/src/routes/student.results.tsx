import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { gradePoint, type Grade } from "@/data/mockData";
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

  const totalPoints = useMemo(() => {
    if (semData?.sgpa != null && totalCreditsEar) {
      return (semData.sgpa * totalCreditsEar).toFixed(1);
    }
    const points = subjects.reduce((a, s) => {
      const gp = s.grade && s.grade in gradePoint ? gradePoint[s.grade as Grade] : 0;
      return a + gp * (s.credits || 0);
    }, 0);
    return points.toFixed(1);
  }, [semData, totalCreditsEar, subjects]);

  const handlePrint = () => {
    window.print();
  };

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

          #print-grade-card,
          #print-grade-card * {
            visibility: visible !important;
          }

          #print-grade-card {
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

          #print-grade-card tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
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
        <div id="print-grade-card" className="bg-white text-black p-6 md:p-8 max-w-4xl mx-auto border shadow-sm rounded-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold uppercase tracking-wide">Maharaja Institute of Technology Mysore</h1>
            <p className="text-xs md:text-sm font-semibold mt-1">An Autonomous Institution Affiliated to VTU</p>
            <h2 className="text-base font-bold mt-3 underline underline-offset-4 decoration-2">Provisional Grade Card</h2>
            <p className="text-xs font-medium mt-1">Semester {sem} Examination</p>
          </div>

          {/* Aligned Student Info */}
          <div className="space-y-1.5 mb-6 text-xs font-semibold border-b pb-4 border-black/30">
            <div className="grid grid-cols-[110px_16px_1fr] items-center">
              <span>USN</span>
              <span>:</span>
              <span className="uppercase font-mono">{dashboard?.usn || "—"}</span>
            </div>
            <div className="grid grid-cols-[110px_16px_1fr] items-center">
              <span>Semester</span>
              <span>:</span>
              <span>Semester {sem || "—"}</span>
            </div>
            <div className="grid grid-cols-[110px_16px_1fr] items-center">
              <span>NAME</span>
              <span>:</span>
              <span className="uppercase">{dashboard?.name || "—"}</span>
            </div>
            <div className="grid grid-cols-[110px_16px_1fr] items-center">
              <span>Branch</span>
              <span>:</span>
              <span className="uppercase">{dashboard?.department || "—"}</span>
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
                {subjects.map((s, idx) => {
                  const gp = s.grade && s.grade in gradePoint ? gradePoint[s.grade as Grade] : "—";
                  const creditsEar = s.grade !== "F" ? s.credits : 0;
                  return (
                    <tr key={s.code}>
                      <td className="border border-black p-2 text-center">{idx + 1}</td>
                      <td className="border border-black p-2 text-center font-mono">{s.code}</td>
                      <td className="border border-black p-2 text-left uppercase break-words leading-tight">{s.name}</td>
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
                  <td className="border border-black p-1.5 text-center" colSpan={8}>SGPA</td>
                  <td className="border border-black p-1.5 text-center" colSpan={2}>
                    {semData?.sgpa != null ? semData.sgpa.toFixed(2) : "—"}
                  </td>
                </tr>
                {/* CGPA Row */}
                <tr className="font-bold">
                  <td className="border border-black p-1.5 text-center" colSpan={8}>CGPA</td>
                  <td className="border border-black p-1.5 text-center" colSpan={2}>
                    {semData?.cgpa != null ? semData.cgpa.toFixed(2) : (dashboard?.overall_cgpa != null ? dashboard.overall_cgpa.toFixed(2) : "—")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Points / SGPA / CGPA Summary Line */}
          <div className="flex justify-end gap-8 text-xs font-bold my-5 py-2.5 border-y border-black/40">
            <div>Total Points : <span className="font-mono font-normal">{totalPoints}</span></div>
            <div>SGPA : <span className="font-mono font-normal">{semData?.sgpa != null ? semData.sgpa.toFixed(2) : "—"}</span></div>
            <div>CGPA : <span className="font-mono font-normal">{semData?.cgpa != null ? semData.cgpa.toFixed(2) : (dashboard?.overall_cgpa != null ? dashboard.overall_cgpa.toFixed(2) : "—")}</span></div>
          </div>

          {/* Footer Dates and Sigs */}
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
      )}
    </>
  );
}
