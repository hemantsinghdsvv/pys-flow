"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { commentSchema, type CommentValues } from "@/features/tasks/schemas";
import { addComment, deleteComment } from "@/features/tasks/actions";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
};

export function CommentsSection({
  taskId,
  comments,
  currentUserId,
  canDeleteAny,
}: {
  taskId: string;
  comments: CommentItem[];
  currentUserId: string;
  canDeleteAny: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  function onSubmit(values: CommentValues) {
    startTransition(async () => {
      try {
        await addComment(taskId, values);
        form.reset();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteComment(id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Add a comment..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Comment
            </Button>
          </div>
        </form>
      </Form>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <UserAvatar name={c.authorName} image={c.authorImage} />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {(canDeleteAny || c.authorId === currentUserId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-6 text-muted-foreground hover:text-destructive"
                      aria-label="Delete comment"
                      disabled={pending}
                      onClick={() => onDelete(c.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
