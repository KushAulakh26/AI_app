import { RegisterPage } from "./RegisterPage"
import { useRegister } from "./useRegister"

export default function RegisterRoute() {
  const vm = useRegister()
  return <RegisterPage {...vm} />
}
