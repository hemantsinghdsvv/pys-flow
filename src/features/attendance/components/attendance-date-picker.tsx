"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function AttendanceDatePicker({ date }: { date: string }) {
  const router = useRouter();
  return (
    <Input
      type="date"
      value={date}
      className="w-44"
      onChange={(e) => {
        const value = e.target.value;
        if (value) router.push(`/attendance?date=${value}`);
      }}
    />
  );
}
