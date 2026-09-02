import { CopywritingPage } from "./CopywritingPage"
import { useCopywriting } from "./useCopywriting"

export default function CopywritingRoute() {
  const vm = useCopywriting()
  return <CopywritingPage {...vm} />
}
