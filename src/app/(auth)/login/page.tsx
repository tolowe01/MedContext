'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const result = await login(data)
    if (result?.error) {
      setServerError(result.error)
    }
  }

  return (
    <main className="min-h-screen bg-mc-surface-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-8 shadow-2xl">
          <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-2 text-center">
            Sign in
          </h1>
          <p className="text-mc-neutral-400 font-body text-sm text-center mb-8">
            Your pharmacist is waiting for you
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-mc-neutral-900 font-body text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-mc-surface-page border-mc-neutral-200 text-mc-neutral-900 placeholder:text-mc-neutral-400 focus:border-mc-primary-400"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-mc-danger-600 text-xs font-body mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-mc-neutral-900 font-body text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="bg-mc-surface-page border-mc-neutral-200 text-mc-neutral-900 placeholder:text-mc-neutral-400 focus:border-mc-primary-400"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-mc-danger-600 text-xs font-body mt-1">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="bg-mc-danger-50 border border-mc-danger-100 rounded-button px-4 py-3">
                <p className="text-mc-danger-800 text-sm font-body">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-3 mt-2 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-mc-neutral-400 font-body mt-6">
            New to MedX?{' '}
            <Link href="/signup" className="text-mc-primary-400 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 rounded">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
