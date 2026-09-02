import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { loginLocalAccount } from '@/lib/localAuth'

export function useLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault()
    if (isSubmitting) return
    setErrorMsg(null)
    if (!email.trim() || !password) {
      setErrorMsg('請輸入郵箱和密碼')
      return
    }
    setIsSubmitting(true)
    try {
      await loginLocalAccount(email.trim(), password)
      const from = searchParams.get('from')
      navigate(from && from.startsWith('/') ? from : '/')
    } catch {
      setErrorMsg('郵箱或密碼不正確，再試一次')
    } finally {
      setIsSubmitting(false)
    }
  }

  return { email, setEmail, password, setPassword, errorMsg, isSubmitting, handleSubmit }
}
