'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
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
    <main className="min-h-screen bg-[#1a1410] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#251e18] border border-[#3a2e25] rounded-cardLarge p-8 shadow-2xl">
          <h1 className="font-display-bold text-screenTitle text-dialogue-text mb-2 text-center">
            Sign in
          </h1>
          <p className="text-dialogue-textMuted font-body text-sm text-center mb-8">
            Your pharmacist is waiting for you
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-dialogue-text font-body text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-[#1a1410] border-dialogue-border text-dialogue-text placeholder:text-dialogue-textMuted focus:border-dialogue-accent"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-red-400 text-xs font-body mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-dialogue-text font-body text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="bg-[#1a1410] border-dialogue-border text-dialogue-text placeholder:text-dialogue-textMuted focus:border-dialogue-accent"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-red-400 text-xs font-body mt-1">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-button px-4 py-3">
                <p className="text-red-300 text-sm font-body">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-dialogue-accent hover:bg-dialogue-accent/90 text-white font-cta text-cta rounded-button py-3 mt-2 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
