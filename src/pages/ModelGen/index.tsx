import { ModelGenPage } from "./ModelGenPage"
import { useModelGen } from "./useModelGen"

export default function ModelGenRoute() {
  const vm = useModelGen()
  return <ModelGenPage {...vm} />
}
