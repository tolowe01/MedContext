'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface LoginCredentials {
  email: string
  password: string
}

export async function login({ email, password }: LoginCredentials) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Login failed' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'pharmacist') {
    redirect('/dashboard')
  }
  redirect('/home')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
