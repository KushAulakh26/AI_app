import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import { registerLocalAccount } from '@/lib/localAuth'

export function useRegister() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault()
    if (isSubmitting) return
    setErrorMsg(null)
    if (!email.trim() || !password || !confirmPassword) {
      setErrorMsg('請填寫郵箱和密碼')
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
    setIsSubmitting(true)
    try {
      await registerLocalAccount(email.trim(), password, displayName.trim() || undefined)
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (/already|exist|taken/i.test(msg)) setErrorMsg('該郵箱已註冊，試試直接登錄')
      else setErrorMsg('註冊沒成功，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    displayName, setDisplayName,
    errorMsg, isSubmitting, handleSubmit,
  }
}
