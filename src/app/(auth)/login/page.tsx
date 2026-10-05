import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";
import { fetchPragyaAPI } from "@/lib/pragya-api";

export const metadata: Metadata = { title: "Sign in - Pragya Yog School" };

export default async function LoginPage() {
  let departments = [];
  try {
    const res = await fetchPragyaAPI("departments");
    if (res?.status) departments = res.data;
  } catch (error) {
    console.error("Failed to load departments for login page", error);
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      {/* ── Left: Studio Sanctuary Visual Panel ── */}
      <div className="relative w-full md:w-1/2 min-h-[380px] md:min-h-screen bg-[#00381F] flex items-center justify-center overflow-hidden">
        <Image
          src="/loginbg.jpg"
          alt="Pragya Yog School Sanctuary"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center"
        />
        {/* Warm luxury overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00381F]/85 via-[#00381F]/20 to-black/20" />
      </div>

      {/* ── Right: Clean Form Panel ── */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-12 md:px-16 lg:px-24 bg-background">
        <div className="w-full max-w-[460px]">
          <Suspense>
            <LoginForm departments={departments} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
