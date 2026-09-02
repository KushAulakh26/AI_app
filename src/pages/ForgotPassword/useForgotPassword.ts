import { useState } from 'react'
import type { FormEvent } from 'react'
import { getPocketBaseUrl } from '@/lib/pb'
import { requestPasswordReset } from '@/lib/localAuth'

export function useForgotPassword() {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'form' | 'submitting' | 'sent'>('form')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault()
    if (!email.trim()) {
      setErrorMsg('請輸入郵箱')
      return
    }
    setErrorMsg(null)
    setPhase('submitting')
    try {
      const status = await fetch(`${getPocketBaseUrl()}/api/system/mail-status`)
      const mail = (await status.json().catch(() => ({ configured: false }))) as { configured?: boolean }
      if (!status.ok || !mail.configured) {
        setErrorMsg('郵件服務暫不可用，請聯繫管理員協助重置密碼')
        setPhase('form')
        return
      }
      await requestPasswordReset(email.trim())
      setPhase('sent')
    } catch {
      setErrorMsg('重置郵件發送失敗，請確認郵箱後再試')
      setPhase('form')
    }
  }

  return { email, setEmail, phase, errorMsg, handleSubmit }
}
