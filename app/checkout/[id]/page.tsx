"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Clock, Car, Phone, FileText, LogOut } from "lucide-react"
import { supabase, type Visitor } from "@/lib/supabase"

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const visitorId = params.id as string

  useEffect(() => {
    if (visitorId) {
      fetchVisitor()
    }
  }, [visitorId])

  const fetchVisitor = async () => {
    try {
      if (!supabase) {
        setError("Database not configured")
        return
      }

      const { data, error } = await supabase.from("visitors").select("*").eq("id", visitorId).single()

      if (error) {
        console.error("Error fetching visitor:", error)
        setError("Visitor not found")
        return
      }

      setVisitor(data)
    } catch (error) {
      console.error("Failed to fetch visitor:", error)
      setError("Failed to load visitor information")
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    if (!visitor || !supabase) return

    setChecking(true)
    try {
      const { error } = await supabase
        .from("visitors")
        .update({
          status: "checked_out",
          check_out_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitor.id)

      if (error) {
        throw error
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (error) {
      console.error("Checkout failed:", error)
      setError("Failed to check out. Please try again.")
    } finally {
      setChecking(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-muted-foreground">Loading visitor information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Error</h2>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={() => router.push("/")} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">Checkout Successful!</h2>
            <p className="text-muted-foreground text-center mb-4">Thank you for your visit. Have a great day!</p>
            <p className="text-sm text-muted-foreground text-center">Redirecting to home page...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-muted-foreground">Visitor not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Visitor Checkout</CardTitle>
          <CardDescription>Confirm your checkout details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={visitor.photo_url || undefined} />
              <AvatarFallback className="text-lg">
                {visitor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{visitor.name}</h3>
              <p className="text-sm text-muted-foreground">
                Status: {visitor.status === "checked_in" ? "Currently Inside" : "Already Left"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Vehicle:</strong> {visitor.vehicle_number}
              </span>
            </div>

            {visitor.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Phone:</strong> {visitor.phone}
                </span>
              </div>
            )}

            {visitor.purpose && (
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Purpose:</strong> {visitor.purpose}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Check-in:</strong> {formatTime(visitor.check_in_time)}
              </span>
            </div>

            {visitor.check_out_time && (
              <div className="flex items-center space-x-3">
                <LogOut className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Check-out:</strong> {formatTime(visitor.check_out_time)}
                </span>
              </div>
            )}
          </div>

          {visitor.status === "checked_in" ? (
            <Button onClick={handleCheckout} disabled={checking} className="w-full">
              {checking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Confirm Checkout
                </>
              )}
            </Button>
          ) : (
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                This visitor has already checked out on {visitor.check_out_time && formatTime(visitor.check_out_time)}
              </p>
            </div>
          )}

          <Button onClick={() => router.push("/")} variant="outline" className="w-full">
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
