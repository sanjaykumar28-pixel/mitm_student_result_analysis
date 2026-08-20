import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuthErrorMessage, useAuth, type UserRole } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — MIT Mysore" },
      { name: "description", content: "Sign in to access your academic dashboard and result analytics." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, loading } = useAuth();
  const [role, setRole] = useState<UserRole>("student");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate({ to: user.role === "admin" ? "/admin/dashboard" : "/student/dashboard" });
    }
  }, [loading, isAuthenticated, user, navigate]);

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    try {
      const u = await login(values.email, values.password, role, values.remember ?? true);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}!`);
      navigate({ to: u.role === "admin" ? "/admin/dashboard" : "/student/dashboard" });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-cover bg-center bg-fixed bg-no-repeat px-4 py-8"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.65)), url('/images/college.jpeg')`
      }}
    >
      {/* Dynamic Keyframe Injection for Sequence Timings */}
      <style>{`
        @keyframes slideFromRight {
          0% { transform: translateX(120%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideFromLeft {
          0% { transform: translateX(-120%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-header-right {
          animation: slideFromRight 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-cards-right {
          opacity: 0;
          animation: slideFromRight 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.8s;
        }
        .animate-login-left {
          opacity: 0;
          animation: slideFromLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 1.5s;
        }
      `}</style>
      {/* PHASE 1: Top Floating Header (Slides from right first) */}
      <div className="animate-header-right w-full max-w-7xl text-center lg:text-right lg:absolute lg:top-12 lg:right-12 mb-8 lg:mb-0 z-20">
        <h1 className="text-2xl md:text-4xl font-black tracking-wider text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            STUDENT RESULT ANALYSIS
        </h1>
      </div>

      {/* Grid Container */}
      <div className="relative z-10 grid w-full max-w-7xl grid-cols-1 gap-8 items-center lg:grid-cols-4 my-auto pt-4 lg:pt-16">
        
        {/* PHASE 2: LEFT COLUMN (Vision Card) - Slides from Right side with delay */}
        <div className="animate-cards-right lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 text-white shadow-xl flex flex-col gap-3 lg:order-2">
          <h3 className="text-2xl font-extrabold tracking-wide text-[#E25C34] text-center lg:text-left">
            Our Vision
          </h3>
          <div className="border-t border-[#E25C34]/50 w-full" />
          <p className="text-sm text-gray-200 leading-relaxed font-medium">
            To be recognized as a premier technical and management institution promoting extensive education fostering research, innovation and entrepreneurial attitude.
          </p>
        </div>

        {/* PHASE 3: CENTER COLUMN (Login Card) - Slides from the Left side last */}
        <div className="animate-login-left lg:col-span-2 w-full max-w-md mx-auto overflow-hidden rounded-2xl border bg-card/95 backdrop-blur-sm p-8 shadow-2xl lg:order-1">
          <div className="mb-6 flex flex-col items-center justify-center gap-3">
            <img 
              src="/images/logo.jpeg" 
              alt="MIT Mysore Logo" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="font-bold text-xl tracking-wide text-foreground">MIT MYSORE</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-center">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">
            Access your dashboard with your valid credentials.
          </p>

          <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@gmail.com"
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox id="remember" defaultChecked {...register("remember")} />
                <span>Remember me</span>
              </label>
              <button type="button" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : `Sign in as ${role}`}
            </Button>

            <Card className="border-dashed bg-muted/40">
              <CardContent className="p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Admin login</p>
                <p>Email: admin@mitmysore.ac.in</p>
                <p>Password: Admin@123 — choose the Admin tab.</p>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* PHASE 2: RIGHT COLUMN (Mission Card) - Slides from Right side along with Vision */}
        <div className="animate-cards-right lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-6 text-white shadow-xl flex flex-col gap-3 lg:order-3">
          <h3 className="text-2xl font-extrabold tracking-wide text-[#E25C34] text-center lg:text-left">
            Our Mission
          </h3>
          <div className="border-t border-[#E25C34]/50 w-full" />
          <ul className="text-xs text-gray-200 space-y-2 list-none pl-0 font-medium">
            <li className="flex items-start gap-1.5">
              <span className="text-[#E25C34] font-bold">•</span>
              <span>To empower students with indispensable knowledge through dedicated teaching and collaborative learning.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#E25C34] font-bold">•</span>
              <span>To advance extensive research in science, engineering and management disciplines.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#E25C34] font-bold">•</span>
              <span>To facilitate entrepreneurial skills through effective institute-industry collaboration and interaction with alumni.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#E25C34] font-bold">•</span>
              <span>To instill the need to uphold ethics in every aspect.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#E25C34] font-bold">•</span>
              <span>To mould holistic individuals capable of contributing to the advancement of the society.</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}