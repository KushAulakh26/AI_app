import { ResetPasswordPage } from "./ResetPasswordPage"
import { useResetPassword } from "./useResetPassword"

export default function ResetPasswordRoute() {
  const props = useResetPassword()
  return <ResetPasswordPage {...props} />
}
