import { redirect } from "next/navigation"

/** iGITit lives in IRIS now; this server keeps the API, verification records and API documentation. */
export default function Home() {
  redirect("/docs")
}
