"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download, FileBox, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { DocumentType } from "@prisma/client";
import { uploadDocument, deleteDocument } from "@/features/documents/actions";
import { DOCUMENT_TYPE_LABELS } from "@/config/labels";
import { DOCUMENT_TYPES } from "@/features/documents/schemas";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DocumentRow = {
  id: string;
  title: string;
  type: DocumentType;
  url: string;
  ownerName: string | null;
  projectName: string | null;
  createdAt: string;
  ownerId: string | null;
};

type Option = { id: string; name: string };

function UploadDialog({
  students,
  projects,
}: {
  students: Option[];
  projects: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<string>("OTHER");
  const [ownerId, setOwnerId] = useState<string>("none");
  const [projectId, setProjectId] = useState<string>("none");
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("type", type);
    fd.set("ownerId", ownerId === "none" ? "" : ownerId);
    fd.set("projectId", projectId === "none" ? "" : projectId);

    startTransition(async () => {
      try {
        await uploadDocument(fd);
        toast.success("Document uploaded");
        setOpen(false);
        form.reset();
        setType("OTHER");
        setOwnerId("none");
        setProjectId("none");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" /> Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc-title">Title *</Label>
            <Input
              id="doc-title"
              name="title"
              placeholder="Offer letter — Jane Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-file">File *</Label>
            <Input id="doc-file" name="file" type="file" ref={fileRef} required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentsManager({
  documents,
  students,
  projects,
  canManage,
  currentUserId,
}: {
  documents: DocumentRow[];
  students: Option[];
  projects: Option[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDocument(id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <UploadDialog students={students} projects={projects} />
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileBox}
          title="No documents"
          description="Upload offer letters, certificates, evaluations, and more."
        />
      ) : (
        <div className="grid gap-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileBox className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        {DOCUMENT_TYPE_LABELS[d.type]}
                      </Badge>
                      {d.ownerName && <span>{d.ownerName}</span>}
                      {d.projectName && <span>· {d.projectName}</span>}
                      <span>· {format(new Date(d.createdAt), "d MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild variant="outline" size="icon" className="size-8">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Download document"
                    >
                      <Download className="size-4" />
                    </a>
                  </Button>
                  {(canManage || d.ownerId === currentUserId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete document"
                      disabled={pending}
                      onClick={() => onDelete(d.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
