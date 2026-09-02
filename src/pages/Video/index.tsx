import { VideoPage } from "./VideoPage"
import { useVideo } from "./useVideo"

export default function VideoRoute() {
  const vm = useVideo()
  return <VideoPage {...vm} />
}
