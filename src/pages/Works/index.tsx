import { WorksPage } from "./WorksPage"
import { useWorks } from "./useWorks"

export default function WorksRoute() {
  const vm = useWorks()
  return <WorksPage {...vm} />
}
