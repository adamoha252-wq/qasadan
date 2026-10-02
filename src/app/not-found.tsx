import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <div className="bg-pixel-grid flex min-h-screen flex-col items-center justify-center gap-8 bg-navy-800 px-4 text-center">
      <LogoMark className="h-20 w-20 text-white" aria-hidden="true" />
      <div className="flex flex-col items-center gap-3">
        <p className="font-heading text-6xl font-bold text-cyan-400">404</p>
        <h1 className="font-heading text-2xl font-bold text-white sm:text-3xl">
          Page not found
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-navy-200 sm:text-base">
          The page you are looking for does not exist or may have been moved. Let us
          get you back on track.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild className="bg-cyan-500 text-navy-900 hover:bg-cyan-400">
          <Link href="/" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to homepage
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-navy-400 bg-transparent text-white hover:bg-navy-700 hover:text-white"
        >
          <Link href="/portfolio" className="inline-flex items-center gap-2">
            <SearchX className="h-4 w-4" aria-hidden="true" />
            Browse our portfolio
          </Link>
        </Button>
      </div>
    </div>
  );
}
