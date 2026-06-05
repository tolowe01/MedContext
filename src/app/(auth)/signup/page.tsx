'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import Link from 'next/link'
import { signup, verifyAccessCode } from '@/actions/signup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  sexe: z.enum(['female', 'male', 'intersex', 'prefer_not_to_say'], {
    required_error: 'Please select an option',
    invalid_type_error: 'Please select an option',
  }),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
})

type SignupFormData = z.infer<typeof signupSchema>

const SEXE_OPTIONS: { value: SignupFormData['sexe']; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'intersex', label: 'Intersex' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export default function SignupPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  // Access-code gate. The patient enters the unique code their pharmacist
  // issued; it is verified server-side before the create-account form is shown.
  const [verified, setVerified] = useState(false)
  const [pharmacyName, setPharmacyName] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setCodeError(null)
    setVerifying(true)
    const result = await verifyAccessCode(codeInput)
    setVerifying(false)
    if ('error' in result) {
      setCodeError(result.error)
      return
    }
    setPharmacyName(result.pharmacyName)
    setVerified(true)
  }

  async function onSubmit(data: SignupFormData) {
    if (!verified) return
    setServerError(null)
    const result = await signup({ ...data, accessCode: codeInput })
    // On success the action redirects; we only get here on error.
    if (result?.error) {
      setServerError(result.error)
    }
  }

  return (
    <main className="min-h-screen bg-mc-surface-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-cardLarge p-8 shadow-2xl">
          {!verified ? (
            <>
              <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-2 text-center">
                Enter your access code
              </h1>
              <p className="text-mc-neutral-400 font-body text-sm text-center mb-8">
                MedX accounts are for patients. Enter the access code your pharmacist gave you to
                get started.
              </p>

              <form onSubmit={verifyCode} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="accessCode" className="text-mc-neutral-900 font-body text-sm">
                    Access code
                  </Label>
                  <Input
                    id="accessCode"
                    autoComplete="one-time-code"
                    autoCapitalize="characters"
                    placeholder="Enter your code"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value)
                      setCodeError(null)
                    }}
                    className="bg-mc-surface-page border-mc-neutral-200 text-mc-neutral-900 placeholder:text-mc-neutral-400 focus:border-mc-primary-400 tracking-widest uppercase"
                  />
                  {codeError && (
                    <p className="text-mc-danger-600 text-xs font-body mt-1">{codeError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={verifying}
                  className="w-full py-3 mt-2 disabled:opacity-50"
                >
                  {verifying ? 'Checking…' : 'Continue'}
                </Button>
              </form>

              <p className="text-center text-sm text-mc-neutral-400 font-body mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-mc-primary-400 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 rounded">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-2 text-center">
                Create your account
              </h1>
              <p className="text-mc-neutral-400 font-body text-sm text-center mb-6">
                A few details so your pharmacist can support you
              </p>

              <div className="bg-mc-primary-50 border border-mc-primary-100 rounded-button px-4 py-3 mb-6">
                <p className="text-mc-neutral-600 font-body text-xs">
                  Enrolling with{' '}
                  <span className="text-mc-neutral-900 font-body-bold">
                    {pharmacyName ?? 'your pharmacy'}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVerified(false)
                    setPharmacyName(null)
                    setServerError(null)
                  }}
                  className="text-mc-primary-400 underline underline-offset-2 text-xs font-body mt-1"
                >
                  Use a different code
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-mc-neutral-900">First name</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
                      className="bg-mc-surface-page"
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <p className="text-mc-danger-600 text-xs font-body">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-mc-neutral-900">Last name</Label>
                    <Input
                      id="lastName"
                      autoComplete="family-name"
                      className="bg-mc-surface-page"
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <p className="text-mc-danger-600 text-xs font-body">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-mc-neutral-900">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="bg-mc-surface-page"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-mc-danger-600 text-xs font-body">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-mc-neutral-900">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="bg-mc-surface-page"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-mc-danger-600 text-xs font-body">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth" className="text-mc-neutral-900">Date of birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className="bg-mc-surface-page"
                    {...register('dateOfBirth')}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-mc-danger-600 text-xs font-body">{errors.dateOfBirth.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sexe" className="text-mc-neutral-900">Sex</Label>
                  <Controller
                    name="sexe"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="sexe" className="bg-mc-surface-page">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEXE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.sexe && (
                    <p className="text-mc-danger-600 text-xs font-body">{errors.sexe.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-mc-neutral-900">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(514) 555-0123"
                    className="bg-mc-surface-page"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-mc-danger-600 text-xs font-body">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-mc-neutral-900">Address</Label>
                  <Input
                    id="address"
                    autoComplete="street-address"
                    placeholder="123 Rue Sainte-Catherine, Montréal"
                    className="bg-mc-surface-page"
                    {...register('address')}
                  />
                  {errors.address && (
                    <p className="text-mc-danger-600 text-xs font-body">{errors.address.message}</p>
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
                  className="w-full py-3 mt-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
              </form>

              <p className="text-center text-sm text-mc-neutral-400 font-body mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-mc-primary-400 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 rounded">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
