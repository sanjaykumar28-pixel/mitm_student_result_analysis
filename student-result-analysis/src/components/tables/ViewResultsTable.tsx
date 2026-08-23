import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminResultRow } from "@/services/adminService";
import { adminService } from "@/services/adminService";
import { toast } from "sonner";

function fmt(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(digits);
}

function CgpaBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">—</span>;
  const num = Number(value);
  let colorClass =
    "bg-primary/10 text-primary border border-primary/20";
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

interface ViewResultsTableProps {
  results: AdminResultRow[];
  onDeleted: (resultId: number) => void;
}

export function ViewResultsTable({ results, onDeleted }: ViewResultsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminResultRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteResult(String(deleteTarget.result_id));
      toast.success(`Result for ${deleteTarget.student_name} deleted successfully.`);
      onDeleted(deleteTarget.result_id);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete result. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
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
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((row) => (
                <tr
                  key={row.result_id}
                  className="group transition-colors hover:bg-muted/30"
                >
                  {/* ID / USN */}
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

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={() =>
                          toast.info(
                            "Edit functionality is not yet available for results."
                          )
                        }
                        title="Edit result"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => setDeleteTarget(row)}
                        title="Delete result"
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

      {/* Delete Confirmation Dialog */}
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
              Delete Result
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the result record for{" "}
              <strong>{deleteTarget?.student_name}</strong> ({deleteTarget?.usn}
              ) — Semester {deleteTarget?.semester}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
