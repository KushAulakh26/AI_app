import { AdminPage } from "./AdminPage"
import { useAdmin } from "./useAdmin"

export default function AdminRoute() {
  const vm = useAdmin()
  return <AdminPage {...vm} />
}
