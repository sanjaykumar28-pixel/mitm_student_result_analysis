import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Search, Trash2, BookOpen, SlidersHorizontal } from "lucide-react";
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
import { adminService, type AddSubjectPayload } from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/add-subject")({
  component: AddSubject,
});

// ── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  subjectName: z.string().trim().min(2, "Subject Name is required").max(100),
  subjectCode: z.string().trim().min(2, "Subject Code is required").max(20),
  credit: z.coerce.number().min(1, "Credit is required").max(10),
  department: z.string().min(1, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
});
type FormValues = z.infer<typeof schema>;

// ── Local subject type (matches AddSubjectResponse) ──────────────────────────
interface SubjectRow {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  credit: number;
  semester: number;
  department: string;
}

// ── Component ────────────────────────────────────────────────────────────────
function AddSubject() {
  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);

  // Subject list (local state — populated from POST responses)
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SubjectRow | null>(null);

  // Filter & search
  const [filterSem, setFilterSem] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ── Submit (Add or "Edit") ─────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (data: FormValues) => {
      if (editingId !== null) {
        // No PUT /admin/subjects endpoint exists in the backend.
        // Update the subject in local state only.
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

      // Add new subject via existing API
      try {
        const payload: AddSubjectPayload = {
          subject_name: data.subjectName,
          subject_code: data.subjectCode,
          credit: data.credit,
          department: data.department,
          semester: Number(data.semester),
        };
        const result = await adminService.addSubject(payload);
        // Append newly created subject to the local list
        setSubjects((prev) => [
          ...prev,
          {
            subject_id: result.subject_id,
            subject_name: result.subject_name ?? data.subjectName,
            subject_code: result.subject_code,
            credit: result.credit ?? data.credit,
            semester: result.semester,
            department: result.department ?? data.department,
          },
        ]);
        toast.success(
          `Subject "${data.subjectName}" (${data.subjectCode.toUpperCase()}) added successfully.`,
        );
        reset();
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not add subject."));
      }
    },
    [editingId, reset],
  );

  // ── Edit: populate form ───────────────────────────────────────────────────
  const handleEdit = useCallback(
    (row: SubjectRow) => {
      setEditingId(row.subject_id);
      setValue("subjectName", row.subject_name, { shouldValidate: false });
      setValue("subjectCode", row.subject_code, { shouldValidate: false });
      setValue("credit", row.credit, { shouldValidate: false });
      setValue("department", row.department, { shouldValidate: false });
      setValue("semester", String(row.semester), { shouldValidate: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setValue],
  );

  // ── Cancel edit ───────────────────────────────────────────────────────────
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    reset();
  }, [reset]);

  // ── Delete (local state only — no backend delete endpoint for subjects) ───
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    setSubjects((prev) =>
      prev.filter((s) => s.subject_id !== deleteTarget.subject_id),
    );
    toast.success(
      `Subject "${deleteTarget.subject_name}" removed from the list.`,
    );
    setDeleteTarget(null);
  }, [deleteTarget]);

  // ── Filtered & searched subjects ──────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchesSem =
        filterSem === "all" || String(s.semester) === filterSem;
      const matchesSearch =
        !q ||
        s.subject_name.toLowerCase().includes(q) ||
        s.subject_code.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);
      return matchesSem && matchesSearch;
    });
  }, [subjects, filterSem, searchQuery]);

  const isEditing = editingId !== null;

  return (
    <>
      <PageHeader
        title={isEditing ? "Edit Subject" : "Add Subject"}
        subtitle={
          isEditing
            ? "Modify the subject details below and save your changes."
            : "Create a new subject for the academic curriculum."
        }
      />

      {/* ── Add / Edit Form ────────────────────────────────────────────────── */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">
            {isEditing ? "Edit Subject Information" : "Subject Information"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            {/* Subject Name — full width */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input
                id="subjectName"
                placeholder="e.g. Data Structures"
                {...register("subjectName")}
              />
              {errors.subjectName && (
                <p className="text-xs text-destructive">
                  {errors.subjectName.message}
                </p>
              )}
            </div>

            {/* Subject Code */}
            <div className="space-y-1.5">
              <Label htmlFor="subjectCode">Subject Code</Label>
              <Input
                id="subjectCode"
                placeholder="e.g. MCA101"
                {...register("subjectCode")}
              />
              {errors.subjectCode && (
                <p className="text-xs text-destructive">
                  {errors.subjectCode.message}
                </p>
              )}
            </div>

            {/* Credit */}
            <div className="space-y-1.5">
              <Label htmlFor="credit">Credit</Label>
              <Input
                id="credit"
                type="number"
                placeholder="e.g. 4"
                {...register("credit")}
              />
              {errors.credit && (
                <p className="text-xs text-destructive">
                  {errors.credit.message}
                </p>
              )}
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={watch("department")}
                onValueChange={(v) =>
                  setValue("department", v, { shouldValidate: true })
                }
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
                <p className="text-xs text-destructive">
                  {errors.department.message}
                </p>
              )}
            </div>

            {/* Semester */}
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select
                value={watch("semester")}
                onValueChange={(v) =>
                  setValue("semester", v, { shouldValidate: true })
                }
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
                <p className="text-xs text-destructive">
                  {errors.semester.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:col-span-2 mt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save Changes"
                    : "Add Subject"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                {isEditing ? "Cancel Edit" : "Reset"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── All Subjects Section ───────────────────────────────────────────── */}
      <div className="mt-8 space-y-4">
        {/* Section header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight">
            All Subjects
          </h2>
          <p className="text-sm text-muted-foreground">
            {subjects.length === 0
              ? "No subjects added yet. Use the form above to add one."
              : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""} added this session.`}
          </p>
        </div>

        {/* Filter & Search Card */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Filter label */}
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="font-medium">Filters</span>
              </div>

              {/* Search input */}
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

              {/* Semester filter */}
              <Select
                value={filterSem}
                onValueChange={(v) => setFilterSem(v)}
              >
                <SelectTrigger
                  id="subject-filter-sem"
                  className="sm:w-44 bg-background"
                >
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

        {/* Table */}
        {subjects.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No subjects yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fill in the form above and click{" "}
              <span className="font-medium">Add Subject</span> to see subjects
              here.
            </p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          /* No filter match */
          <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-foreground">
              No subjects match your filters
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting the semester or search query.
            </p>
          </div>
        ) : (
          /* Subjects table */
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">
                      #
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Subject Name
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Subject Code
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Department
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Semester
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Credit
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubjects.map((row, idx) => (
                    <tr
                      key={row.subject_id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      {/* # */}
                      <td className="px-4 py-3.5 text-muted-foreground tabular-nums text-xs">
                        {idx + 1}
                      </td>

                      {/* Subject Name */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">
                          {row.subject_name}
                        </p>
                        {/* Show department on mobile */}
                        <p className="text-xs text-muted-foreground md:hidden">
                          {row.department}
                        </p>
                      </td>

                      {/* Subject Code */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-medium text-primary bg-primary/8 rounded-md px-1.5 py-0.5 border border-primary/15">
                          {row.subject_code}
                        </span>
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

                      {/* Credit */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="tabular-nums text-foreground">
                          {row.credit}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => handleEdit(row)}
                            title="Edit subject"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeleteTarget(row)}
                            title="Delete subject"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────── */}
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
              <strong>{deleteTarget?.subject_name}</strong> (
              {deleteTarget?.subject_code}) — Semester{" "}
              {deleteTarget?.semester}? This will remove it from the current
              list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
