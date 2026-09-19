import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Search, Trash2, BookOpen, SlidersHorizontal, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { departments } from "@/data/mockData";
import {
  adminService,
  type AddSubjectPayload,
  type AdminSubjectRow,
} from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/add-subject")({
  component: AddSubject,
});

// ── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  subjectName: z.string().trim().min(2, "Subject Name is required").max(100),
  subjectCode: z.string().trim().min(2, "Subject Code is required").max(20),
  credit: z.coerce.number().min(1, "Credit is required").max(20),
  department: z.string().min(1, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
});
type FormValues = z.infer<typeof schema>;

// ── Component ────────────────────────────────────────────────────────────────
function AddSubject() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<AdminSubjectRow[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminSubjectRow | null>(null);
  const [filterSem, setFilterSem] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadSubjects = useCallback(async () => {
    setIsLoadingSubjects(true);
    setSubjectsError(null);
    try {
      const rows = await adminService.getSubjects();
      setSubjects(rows ?? []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not load subjects.");
      setSubjectsError(message);
      setSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const onSubmit = useCallback(
    async (data: FormValues) => {
      if (editingId !== null) {
        setSubjects((prev) =>
          prev.map((s) =>
            s.subject_id === editingId
              ? {
                  ...s,
                  subject_name: data.subjectName,
                  subject_code: data.subjectCode.toUpperCase(),
                  credit: data.credit,
                  department: data.department,
                  semester: Number(data.semester),
                }
              : s,
          ),
        );
        toast.success(`Subject "${data.subjectName}" updated locally.`);
        reset();
        setEditingId(null);
        return;
      }

      try {
        const payload: AddSubjectPayload = {
          subject_name: data.subjectName,
          subject_code: data.subjectCode,
          credit: data.credit,
          department: data.department,
          semester: Number(data.semester),
        };
        await adminService.addSubject(payload);
        toast.success(
          `Subject "${data.subjectName}" (${data.subjectCode.toUpperCase()}) added successfully.`,
        );
        reset();
        await loadSubjects();
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not add subject."));
      }
    },
    [editingId, loadSubjects, reset],
  );

  const handleEdit = useCallback(
    (row: AdminSubjectRow) => {
      setEditingId(row.subject_id);
      setValue("subjectName", row.subject_name ?? "", { shouldValidate: false });
      setValue("subjectCode", row.subject_code ?? "", { shouldValidate: false });
      setValue("credit", row.credit ?? 0, { shouldValidate: false });
      setValue("department", row.department ?? "", { shouldValidate: false });
      setValue("semester", String(row.semester ?? ""), { shouldValidate: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setValue],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    reset();
  }, [reset]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    setSubjects((prev) => prev.filter((s) => s.subject_id !== deleteTarget.subject_id));
    toast.success(`Subject "${deleteTarget.subject_name ?? "subject"}" removed from the list.`);
    setDeleteTarget(null);
  }, [deleteTarget]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchesSem = filterSem === "all" || String(s.semester) === filterSem;
      const subjectName = (s.subject_name ?? "").toLowerCase();
      const subjectCode = (s.subject_code ?? "").toLowerCase();
      const departmentName = (s.department ?? "").toLowerCase();
      const matchesSearch =
        !q || subjectName.includes(q) || subjectCode.includes(q) || departmentName.includes(q);
      return matchesSem && matchesSearch;
    });
  }, [subjects, filterSem, searchQuery]);

  const isEditing = editingId !== null;

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      <PageHeader
        title={isEditing ? "Edit Subject" : "Add Subject"}
        subtitle={
          isEditing
            ? "Modify the subject details below and save your changes."
            : "Create a new subject for the academic curriculum."
        }
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">
            {isEditing ? "Edit Subject Information" : "Subject Information"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input
                id="subjectName"
                placeholder="e.g. Data Structures"
                {...register("subjectName")}
              />
              {errors.subjectName && (
                <p className="text-xs text-destructive">{errors.subjectName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subjectCode">Subject Code</Label>
              <Input id="subjectCode" placeholder="e.g. MCA101" {...register("subjectCode")} />
              {errors.subjectCode && (
                <p className="text-xs text-destructive">{errors.subjectCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credit">Credit</Label>
              <Input id="credit" type="number" placeholder="e.g. 4" {...register("credit")} />
              {errors.credit && <p className="text-xs text-destructive">{errors.credit.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={watch("department")}
                onValueChange={(v) => setValue("department", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-xs text-destructive">{errors.department.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select
                value={watch("semester")}
                onValueChange={(v) => setValue("semester", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.semester && (
                <p className="text-xs text-destructive">{errors.semester.message}</p>
              )}
            </div>

            <div className="flex gap-2 sm:col-span-2 mt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Add Subject"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                {isEditing ? "Cancel Edit" : "Reset"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">All Subjects</h2>
          <p className="text-sm text-muted-foreground">
            {isLoadingSubjects
              ? "Loading subjects…"
              : subjects.length === 0
                ? "No subjects added yet. Use the form above to add one."
                : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""} in the database.`}
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="font-medium">Filters</span>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="subject-search"
                  placeholder="Search subjects…"
                  className="pl-9 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={filterSem} onValueChange={(v) => setFilterSem(v)}>
                <SelectTrigger id="subject-filter-sem" className="sm:w-44 bg-background">
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Semester {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoadingSubjects ? (
          <div className="rounded-2xl border bg-card p-12 shadow-sm">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subjects…
            </div>
          </div>
        ) : subjectsError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-destructive">Unable to load subjects</p>
            <p className="mt-1 text-xs text-muted-foreground">{subjectsError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void loadSubjects()}
            >
              Retry
            </Button>
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No subjects yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill in the form above and click <span className="font-medium">Add Subject</span> to
              see subjects here.
            </p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-foreground">No subjects match your filters</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting the semester or search query.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Subject Code</TableHead>
                    <TableHead className="hidden md:table-cell">Department</TableHead>
                    <TableHead className="text-center">Semester</TableHead>
                    <TableHead className="text-center">Credit</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map((row, idx) => (
                    <TableRow key={row.subject_id}>
                      <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <p className="font-semibold text-foreground">
                          {row.subject_name ?? "Unnamed subject"}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden">
                          {row.department ?? "Unassigned"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 rounded-md px-2 py-1 uppercase tracking-wider">
                          {row.subject_code}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="font-normal whitespace-nowrap">
                          {row.department ?? "Unassigned"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{row.semester}</TableCell>
                      <TableCell className="text-center">{row.credit ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => handleEdit(row)}
                            title="Edit subject"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeleteTarget(row)}
                            title="Delete subject"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </span>
              Delete Subject
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.subject_name ?? "this subject"}</strong> (
              {deleteTarget?.subject_code}) — Semester {deleteTarget?.semester}? This will remove it
              from the current list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
