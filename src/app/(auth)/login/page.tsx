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
          src="/studio.jpg"
          alt="Pragya Yog School Sanctuary — Central, Hong Kong"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center"
        />
        {/* Warm luxury overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00381F]/85 via-[#00381F]/20 to-black/20" />

        {/* Studio Location & Brand Overlay Badge */}
        <div className="absolute bottom-8 left-8 right-8 z-10 hidden sm:block p-6 rounded-2xl bg-[#00381F]/75 backdrop-blur-md border border-[#D9AE29]/30 text-white shadow-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="size-2 rounded-full bg-[#D9AE29] animate-pulse" />
            <p className="font-sans text-[11px] font-semibold uppercase tracking-widest text-[#D9AE29]">
              Central Hong Kong Sanctuary
            </p>
          </div>
          <h2 className="font-serif text-2xl font-medium tracking-normal text-white">
            Pragya Yog School
          </h2>
          <p className="font-sans text-xs text-[#F5EFE5]/80 mt-1">
            1303, Tak Woo House, 1-3 Wo On Lane, Central · Where Science Meets Spirituality
          </p>
        </div>
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
