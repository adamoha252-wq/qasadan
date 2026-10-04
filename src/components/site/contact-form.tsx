"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().max(150, "Subject is too long").optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please tell us a bit more (at least 10 characters)").max(5000),
});

type ContactForm = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "" },
  });

  const onSubmit = async (values: ContactForm) => {
    setStatus("idle");
    setServerError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setServerError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
      setServerError("Network error. Please check your connection and try again.");
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-200 bg-cyan-50 px-6 py-12 text-center"
      >
        <CheckCircle2 className="ab-icon h-12 w-12 text-cyan-600" aria-hidden="true" />
        <div>
          <h3 className="font-heading text-lg font-semibold text-navy-800">Message sent!</h3>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-600">
            Thank you for reaching out. Our team will review your message and get back to
            you within 1–2 business days.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setStatus("idle")}
          className="border-cyan-300 text-cyan-700 hover:bg-cyan-100 hover:text-cyan-800"
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {status === "error" && serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {serverError}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-name">
            Full name <span className="text-red-500" aria-hidden="true">*</span>
          </Label>
          <Input
            id="contact-name"
            placeholder="Your name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="contact-name-error" role="alert" className="text-xs text-red-600">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-email">
            Email <span className="text-red-500" aria-hidden="true">*</span>
          </Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="contact-email-error" role="alert" className="text-xs text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-phone">Phone (optional)</Label>
          <Input
            id="contact-phone"
            type="tel"
            placeholder="+252 61 000 0000"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            {...register("phone")}
          />
          {errors.phone && (
            <p id="contact-phone-error" role="alert" className="text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-subject">Subject (optional)</Label>
          <Input
            id="contact-subject"
            placeholder="What is this about?"
            aria-invalid={!!errors.subject}
            aria-describedby={errors.subject ? "contact-subject-error" : undefined}
            {...register("subject")}
          />
          {errors.subject && (
            <p id="contact-subject-error" role="alert" className="text-xs text-red-600">
              {errors.subject.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message">
          Message <span className="text-red-500" aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="contact-message"
          placeholder="Tell us about your project, timeline, and goals…"
          rows={6}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          {...register("message")}
        />
        {errors.message && (
          <p id="contact-message-error" role="alert" className="text-xs text-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="btn-glow self-start bg-navy-800 text-white hover:bg-navy-700"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}
