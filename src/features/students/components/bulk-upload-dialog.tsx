"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { bulkUploadStudents, type BulkUploadResult } from "@/features/students/bulk-upload-action";

// ─── CSV template content ──────────────────────────────────────

const CSV_TEMPLATE = `name,email,password,phone,rollNumber,department,skills
Jane Smith,jane.smith@university.edu,Welcome@123,9876543210,CS001,Computer Science,"React,Node.js,TypeScript"
Raj Patel,raj.patel@university.edu,,9123456780,EC002,Electronics,"Python,Arduino"
`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "drishti_students_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Result display ────────────────────────────────────────────

function UploadResults({ result }: { result: BulkUploadResult }) {
  return (
    <div className="space-y-4 pt-2">
      {result.created.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="mb-2 flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            {result.created.length} student{result.created.length !== 1 ? "s" : ""} created
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.created.map((s) => (
              <div key={s.email} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.name} — {s.email}</span>
                <code className="rounded bg-muted px-1 text-xs">{s.password}</code>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Share the generated passwords with each student.
          </p>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <div className="mb-2 flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
            <XCircle className="size-4" />
            {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} failed
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.errors.map((e) => (
              <div key={`${e.row}-${e.email}`} className="text-sm">
                <span className="font-medium">Row {e.row}</span>
                {e.email && <span className="text-muted-foreground"> ({e.email})</span>}
                {" — "}
                <span className="text-red-700 dark:text-red-400">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// ─── Main dialog ───────────────────────────────────────────────

export function BulkUploadDialog({
  companies,
  activeCompanyId,
}: {
  companies: { id: string; name: string }[];
  activeCompanyId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>(activeCompanyId ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file?.name ?? null);
    setResult(null);
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a CSV file first.");
      return;
    }
    if (!activeCompanyId && !selectedCompany) {
      toast.error("Please select a company first.");
      return;
    }

    const formData = new FormData();
    formData.set("csv", file);
    if (!activeCompanyId) {
      formData.set("companyId", selectedCompany);
    }

    startTransition(async () => {
      try {
        const res = await bulkUploadStudents(formData);
        setResult(res);
        if (res.created.length > 0) {
          toast.success(`${res.created.length} student${res.created.length !== 1 ? "s" : ""} imported successfully.`);
        }
        if (res.errors.length > 0 && res.created.length === 0) {
          toast.error("All rows failed. Check the errors below.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setResult(null);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" id="bulk-upload-trigger">
          <Upload className="size-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Students</DialogTitle>
          <DialogDescription>
            Import multiple students at once from a CSV file. Download the
            template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!activeCompanyId && (
            <div className="space-y-2">
              <Label>Target Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template download */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={downloadTemplate}
            type="button"
          >
            <Download className="size-4" />
            Download CSV Template
          </Button>

          {/* CSV format hint */}
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">CSV columns:</p>
            <code className="block leading-5">
              name, email, password (optional), phone (optional),
              rollNumber (optional), department (optional),
              skills (comma-separated, quoted)
            </code>
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <label
              htmlFor="csv-file-input"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-muted/50"
            >
              <Upload className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {fileName ?? "Click to select a CSV file"}
              </span>
              {fileName && (
                <span className="text-xs text-muted-foreground">
                  Click to change
                </span>
              )}
            </label>
            <input
              id="csv-file-input"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {/* Upload button */}
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={pending || !fileName}
            id="bulk-upload-submit"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Upload & Import
              </>
            )}
          </Button>

          {/* Results */}
          {result && <UploadResults result={result} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
