"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy-800 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export function PublishBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Published</Badge>
  ) : (
    <Badge variant="secondary" className="bg-slate-100 text-slate-600">Draft</Badge>
  );
}

export function ArchivedBadge() {
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Archived</Badge>;
}

const inquiryStatusStyles: Record<string, string> = {
  NEW: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100",
  READ: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  RESPONDED: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  ARCHIVED: "bg-amber-100 text-amber-800 hover:bg-amber-100",
};

export function InquiryStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn(inquiryStatusStyles[status] || inquiryStatusStyles.READ)}>
      {status}
    </Badge>
  );
}

export function DeleteButton({
  onConfirm,
  label = "Delete",
  title = "Are you sure?",
  description = "This action cannot be undone.",
  disabled,
}: {
  onConfirm: () => Promise<void> | void;
  label?: string;
  title?: string;
  description?: string;
  disabled?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || deleting}
          className="h-8 gap-1.5 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          aria-label={label}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{deleting ? "Deleting…" : label}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              setDeleting(true);
              try {
                await onConfirm();
              } finally {
                setDeleting(false);
              }
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                Deleting…
              </>
            ) : (
              "Yes, delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center"
    >
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-red-200 text-red-700">
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyTableState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
