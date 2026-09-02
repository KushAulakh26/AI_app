import { ForgotPasswordPage } from "./ForgotPasswordPage"
import { useForgotPassword } from "./useForgotPassword"

export default function ForgotPasswordRoute() {
  const props = useForgotPassword()
  return <ForgotPasswordPage {...props} />
}
