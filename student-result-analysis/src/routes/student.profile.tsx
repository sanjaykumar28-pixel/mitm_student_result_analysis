import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { studentService, type StudentDashboardResponse } from "@/services/studentService";
import { 
  User, Mail, BookOpen, Award, ShieldCheck, 
  GraduationCap, Building, CheckCircle2, Circle, 
  CreditCard, Activity
} from "lucide-react";

export const Route = createFileRoute("/student/profile")({
  component: StudentProfile,
});

function StudentProfile() {
  const { user } = useAuth();
  const [data, setData] = useState<StudentDashboardResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentService.getDashboard().then((payload) => {
      if (!cancelled) setData(payload);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const name = user?.name ?? "Student";
  const email = user?.email ?? "";
  const usn = user?.usn || user?.id || data?.usn || "—";
  const department = data?.department || user?.department || "—";
  const semester = data?.semester || user?.semester || "—";
  
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("") || "S";
  
  const sgpa = data?.current_sgpa ? data.current_sgpa.toFixed(2) : "—";
  const cgpa = data?.overall_cgpa ? data.overall_cgpa.toFixed(2) : "—";
  const currentSemester = data?.current_semester || semester;
  const status = data?.academic_status || "Active";

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-300">
      <PageHeader title="Student Profile" subtitle="Your personal information and academic details." />
      
      {/* 1. Profile Header */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="h-32 w-full bg-gradient-to-r from-primary/80 to-primary"></div>
        <CardContent className="relative px-6 pb-6 pt-0 sm:px-10">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <Avatar className="-mt-16 h-32 w-32 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-4xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="mt-4 flex flex-1 flex-col items-center text-center sm:mt-0 sm: items-start sm:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{name}</h2>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
                <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {email}</span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {user?.role === "student" ? "Student Account" : "User Account"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Student ID / USN</span>
              <span className="mt-1 text-sm font-semibold">{usn}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Department</span>
              <span className="mt-1 text-sm font-semibold">{department}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Semester</span>
              <span className="mt-1 text-sm font-semibold">{semester !== "—" ? `Semester ${semester}` : "—"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
              <span className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-success">
                <span className="h-2 w-2 rounded-full bg-success"></span>
                {status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Personal & Academic Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* 2. Personal Information */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Full Name</div>
                  <div className="mt-1 text-base font-medium">{name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email Address</div>
                  <div className="mt-1 text-base font-medium">{email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Student ID / USN</div>
                  <div className="mt-1 text-base font-medium">{usn}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Account Role</div>
                  <div className="mt-1 text-base font-medium capitalize">{user?.role || "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Academic Information */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building className="h-4 w-4" /> Department
                  </div>
                  <div className="mt-1 text-base font-medium">{department}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BookOpen className="h-4 w-4" /> Current Semester
                  </div>
                  <div className="mt-1 text-base font-medium">{currentSemester !== "—" ? `Semester ${currentSemester}` : "—"}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CreditCard className="h-4 w-4" /> Student ID (USN)
                  </div>
                  <div className="mt-1 text-base font-medium">{usn}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Activity className="h-4 w-4" /> Academic Status
                  </div>
                  <div className="mt-1 text-base font-medium">{status}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Performance & Progress */}
        <div className="space-y-6">
          {/* 4. Academic Performance Summary */}
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground">Current SGPA</div>
                  <div className="mt-2 text-3xl font-bold text-primary">{sgpa}</div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground">Overall CGPA</div>
                  <div className="mt-2 text-3xl font-bold text-primary">{cgpa}</div>
                </div>
              </div>
              
              {data?.recent_subjects && data.recent_subjects.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Recent Subjects</div>
                  <div className="space-y-2">
                    {data.recent_subjects.slice(0, 3).map((sub, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 p-2 text-sm">
                        <span className="truncate pr-4 font-medium" title={sub.name}>{sub.code}</span>
                        <span className="font-semibold text-primary">{sub.marks} <span className="text-xs text-muted-foreground">({sub.grade || "-"})</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Academic Progress */}
          {typeof currentSemester === "number" && currentSemester > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Academic Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative border-l border-muted-foreground/20 ml-3 space-y-6">
                  {Array.from({ length: Math.max(currentSemester + 1, 4) }).map((_, i) => {
                    const semNumber = i + 1;
                    const isCompleted = semNumber < currentSemester;
                    const isCurrent = semNumber === currentSemester;
                    
                    return (
                      <div key={semNumber} className="relative flex items-center gap-4 pl-6">
                        <div className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-background ${isCompleted ? "text-primary" : isCurrent ? "text-primary" : "text-muted"}`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 bg-background" />
                          ) : isCurrent ? (
                            <Circle className="h-4 w-4 fill-primary/20 bg-background" />
                          ) : (
                            <Circle className="h-4 w-4 bg-background" />
                          )}
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                          <span className={`text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                            Semester {semNumber}
                          </span>
                          <span className={`text-xs font-semibold ${isCompleted ? "text-success" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                            {isCompleted ? "Completed" : isCurrent ? "Current" : "Upcoming"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

