import { ToolsPage } from "./ToolsPage"
import { useTools } from "./useTools"

export default function ToolsRoute() {
  const vm = useTools()
  return <ToolsPage {...vm} />
}
