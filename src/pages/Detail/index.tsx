import { DetailPage } from "./DetailPage"
import { useDetail } from "./useDetail"

export default function DetailRoute() {
  const vm = useDetail()
  return <DetailPage {...vm} />
}
