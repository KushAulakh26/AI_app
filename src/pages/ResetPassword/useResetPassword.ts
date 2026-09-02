import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { confirmPasswordReset } from '@/lib/localAuth'

export function useResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault()
    if (!token) {
      setErrorMsg('重置連結已失效，請重新申請')
      return
    }
    if (password.length < 8) {
      setErrorMsg('密碼至少 8 位')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('兩次輸入的密碼不一致')
      return
    }
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, password)
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (/invalid|expired|token/i.test(msg)) setErrorMsg('重置連結無效或已過期，請重新申請')
      else setErrorMsg('密碼重置失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return { token, password, setPassword, confirmPassword, setConfirmPassword, errorMsg, isSubmitting, handleSubmit }
}
