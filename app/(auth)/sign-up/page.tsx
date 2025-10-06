"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,

} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import axios from "axios";
import ModeToggle from "@/components/layout-module/themeToggle";
import Image from "next/image";

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpInput & { confirmPassword: string }>({
    resolver: zodResolver(
      signUpSchema
        .extend({
          confirmPassword: signUpSchema.shape.password,
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        })
    ),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true);
    try {
      // Register user in your DB
      const response = await axios.post("/api/auth/sign-up", data);

      if (response.status === 201) {
        // Immediately sign in with NextAuth credentials provider
        const res = await signIn("credentials", {
          redirect: false,
          email: data.email,
          password: data.password,
        });
        if (res?.ok) {
          window.location.href = "/onboarding";
        } else {
          form.setError("root", {
            message: res?.error || "Sign in failed after registration",
          });
        }
      } else {
        form.setError("root", { message: response.data.error });
      }
    } catch (error) {
      form.setError("root", {
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen  flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl rounded-2xl">
        <CardContent className="grid md:grid-cols-2 p-0">
          {/* Left Section - Enhanced with background and content */}
          <div className="p-8 md:p-12 flex flex-col justify-between dark:bg-primary bg-secondary text-white h-full">
            <div className="flex flex-col h-full justify-center items-center space-x-3 mb-8">
              <Image
                src="https://ai.prabisha.com/icons/favicon.png"
                alt="Logo"
                width={80}
                height={80}
                unoptimized
                className="rounded-lg p-2"
              />
              <div className="text-center flex-col flex gap-2">
                <h1 className="text-2xl font-bold">
                  {process.env.NEXT_PUBLIC_APP_NAME || "My Project"}
                </h1>
                <p className="100 text-sm">
                  Powered by{" "}
                  <span className="dark:text-secondary font-bold text-orange-400">
                    <a
                      href="https://prabisha.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Prabisha Consulting{" "}
                    </a>
                  </span>
                </p>
                <h1 className="text-2xl font-bold">Create Account</h1>
                <p className="100 text-sm">
                  Sign up to get started with project management
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
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
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <div className="absolute top-4 right-4 z-10">
              <ModeToggle />
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold 800">Sign Up</h2>
              <p className="600 mt-2">
                Create a new account to start managing your projects
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="700">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter your full name"
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
                      <FormLabel className="700">Password</FormLabel>
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="700">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
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
                  className="w-full h-12 rounded-lg  transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="600">
                Already have an account?{" "}
                <Link href="/sign-in" className="font-medium 600 hover:500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
