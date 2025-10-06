"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import ModeToggle from "@/components/layout-module/themeToggle";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.ok) {
        window.location.href = "/all-task";
      } else {
        form.setError("root", { message: "Invalid credentials" });
      }
    } catch {
      form.setError("root", { message: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 ">
      <Card className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl rounded-2xl">
        <CardContent className="grid md:grid-cols-2 p-0">
          {/* Left Section - Enhanced with background and content */}
          <div className=" p-8 md:p-12 flex flex-col justify-between dark:bg-primary bg-secondary text-white h-full ">
            <div className="flex flex-col h-full justify-center items-center space-x-3 mb-8">
              <Image
                src="https://ai.prabisha.com/icons/favicon.png"
                alt="Logo"
                width={80}
                height={80}
                unoptimized
                className="rounded-lg  p-2"
              />
              <div className=" text-center flex-col flex gap-2">
                <h1 className="text-2xl font-bold">
                  {process.env.NEXT_PUBLIC_APP_NAME || "My Project"}
                </h1>
                <p className="100 text-sm">
                  Powered by{" "}
                  <span className=" dark:text-secondary font-bold text-orange-400">
                    <a
                      href="https://prabisha.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Prabisha Consulting{" "}
                    </a>
                  </span>
                </p>
                <h1 className="text-2xl font-bold"> Welcome Back</h1>
                <p className="100 text-sm">
                  Sign in to manage your account securely.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t ">
              <p className="text-blue-200 text-sm">
                Need assistance?{" "}
                <a
                  href="tel:+91-9599824600"
                  className="text-white font-medium hover:underline"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

          {/* Right Section - Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center  ">
            <div className="absolute top-4 right-4 z-10">
              <ModeToggle />
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold 800">Sign In</h2>
              <p className="600 mt-2">
                Enter your credentials to access your account
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="700">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="700">Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-sm 600 hover:500 font-medium"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 500" />
                            ) : (
                              <Eye className="h-5 w-5 500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
            {/* <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="600">
                Don't have an account?{" "}
                <Link href="/sign-up" className="font-medium 600 hover:500">
                  Sign up
                </Link>
              </p>
            </div> */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
