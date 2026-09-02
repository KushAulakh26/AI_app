import { LoginPage } from "./LoginPage"
import { useLogin } from "./useLogin"

export default function LoginRoute() {
  const vm = useLogin()
  return <LoginPage {...vm} />
}
