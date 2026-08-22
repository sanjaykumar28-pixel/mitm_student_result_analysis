import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { departments } from "@/data/mockData";
import { adminService } from "@/services/adminService";
import { getApiErrorMessage } from "@/services/api";

export const Route = createFileRoute("/admin/add-subject")({
  component: AddSubject,
});

const schema = z.object({
  subjectName: z.string().trim().min(2, "Subject Name is required").max(100),
  subjectCode: z.string().trim().min(2, "Subject Code is required").max(20),
  credit: z.coerce.number().min(1, "Credit is required").max(10),
  department: z.string().min(1, "Department is required"),
  semester: z.string().min(1, "Semester is required"),
});
type FormValues = z.infer<typeof schema>;

function AddSubject() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      await adminService.addSubject({
        subject_name: data.subjectName,
        subject_code: data.subjectCode,
        credit: data.credit,
        department: data.department,
        semester: Number(data.semester),
      });
      toast.success(`Subject ${data.subjectName} (${data.subjectCode}) added successfully.`);
      reset();
      navigate({ to: "/admin/dashboard" });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not add subject."));
    }
  };

  return (
    <>
      <PageHeader title="Add Subject" subtitle="Create a new subject for the academic curriculum." />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Subject Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input id="subjectName" placeholder="e.g. Data Structures" {...register("subjectName")} />
              {errors.subjectName && <p className="text-xs text-destructive">{errors.subjectName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subjectCode">Subject Code</Label>
              <Input id="subjectCode" placeholder="e.g. MCA101" {...register("subjectCode")} />
              {errors.subjectCode && <p className="text-xs text-destructive">{errors.subjectCode.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit">Credit</Label>
              <Input id="credit" type="number" placeholder="e.g. 4" {...register("credit")} />
              {errors.credit && <p className="text-xs text-destructive">{errors.credit.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={watch("department")} onValueChange={(v) => setValue("department", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={watch("semester")} onValueChange={(v) => setValue("semester", v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.semester && <p className="text-xs text-destructive">{errors.semester.message}</p>}
            </div>

            <div className="flex gap-2 sm:col-span-2 mt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add Subject"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/dashboard" })}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
