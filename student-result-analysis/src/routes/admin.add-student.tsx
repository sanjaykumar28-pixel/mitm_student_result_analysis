import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/admin/add-student")({
  component: AddStudent,
});

const schema = z.object({
  studentId: z.string().trim().min(3, "Student ID required").max(20),
  name: z.string().trim().min(2, "Name required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  department: z.string().min(1, "Department required"),
  semester: z.string().min(1, "Semester required"),
  password: z.string().min(6, "Password must be at least 6 characters").max(64),
});
type FormValues = z.infer<typeof schema>;

function AddStudent() {
  const [addedStudents, setAddedStudents] = useState<any[]>([]);
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
      const created = await adminService.addStudent({
        usn: data.studentId,
        name: data.name,
        email: data.email,
        department: data.department,
        semester: Number(data.semester),
        password: data.password,
      });
      toast.success(`${created.name} (${created.usn}) can now sign in as a student.`);
      setAddedStudents((prev) => [
        {
          usn: data.studentId,
          name: data.name,
          email: data.email,
          department: data.department,
          semester: data.semester,
        },
        ...prev,
      ]);
      reset();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not add student."));
    }
  };

  return (
    <>
      <PageHeader title="Add Student" subtitle="Create a new student account and assign academic details." />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="studentId">Student ID</Label>
              <Input id="studentId" placeholder="4MHXXXXXXX" {...register("studentId")} />
              {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@gmail.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="password">Initial Password</Label>
              <Input id="password" type="password" placeholder="Min 6 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Add Student"}
              </Button>
              <Button type="button" variant="outline" onClick={() => reset()}>Reset</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 max-w-3xl">
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
                    </tr>
                  </thead>
                  <tbody>
                    {addedStudents.map((student, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 align-middle">{index + 1}</td>
                        <td className="p-4 align-middle font-medium">{student.usn}</td>
                        <td className="p-4 align-middle">{student.name}</td>
                        <td className="p-4 align-middle text-muted-foreground">{student.email}</td>
                        <td className="p-4 align-middle">{student.department}</td>
                        <td className="p-4 align-middle">{student.semester}</td>
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
