import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 to-indigo-500 flex items-center justify-center">
      <div className="text-center  px-4">
        <div className="flex rounded-2xl bg-white flex-col items-center gap-5 p-20 shadow-2xl">
          <div className="flex">
            <Image src="Logo.png" width={250} height={200} alt="Logo" className="h-12 mb-4" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-4 text-blue-500">Visitor Management System</h1>
            <p className="text-xl text-muted-foreground mb-8">visitor registration with real-time monitoring</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="bg-blue-500 text-white" size="lg">
                <Link href="/register">Register as Visitor</Link>
              </Button>

              <Button asChild className="bg-blue-500 text-white" size="lg">
                <Link href="/register_emp">Register as Employee</Link>
              </Button>
              <Button asChild className="bg-blue-500 text-white" size="lg">
                <Link href="/admin">Admin Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}
