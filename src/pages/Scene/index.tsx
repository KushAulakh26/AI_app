import { ScenePage } from "./ScenePage"
import { useScene } from "./useScene"

export default function SceneRoute() {
  const vm = useScene()
  return <ScenePage {...vm} />
}
