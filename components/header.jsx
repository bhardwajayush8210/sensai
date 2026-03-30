  "use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

import { Button } from "./ui/button";
import {
  PenBox,
  LayoutDashboard,
  FileText,
  GraduationCap,
  ChevronDown,
  StarsIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { checkUser } from "@/lib/checkUser";

export default  function Header() {
   const { isLoaded, isSignedIn } = useUser();

   if (!isLoaded) return null;

  // await checkUser();

  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 `supports-[backdrop-filter]:bg-background/60`">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Sensai Logo"
            width={200}
            height={60}
            className="h-12 py-1 w-auto object-contain"
          />
        </Link>

        {/* Right Side */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* ✅ LOGGED IN FEATURES */}
          {isSignedIn && (
            <>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="hidden md:inline-flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden md:block">Industry Insights</span>
                </Button>

                <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>

              {/* Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <StarsIcon className="h-4 w-4" />
                    <span className="hidden md:block">Growth Tools</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/resume" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Build Resume
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/ai-cover-letter"
                      className="flex items-center gap-2"
                    >
                      <PenBox className="h-4 w-4" />
                      Cover Letter
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/interview" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Interview Prep
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {/* ❌ LOGGED OUT */}
          {!isSignedIn && (
            <SignInButton>
              <Button variant="outline">Sign In</Button>
            </SignInButton>
          )}

          {/* ✅ USER BUTTON */}
          {isSignedIn && (
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          )}
        </div>
      </nav>
    </header>
  );
}
