"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Users, UserCheck, Clock, LogOut } from "lucide-react"
import { supabase, isSupabaseConfigured, type Visitor } from "@/lib/supabase"
import Image from "next/image"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { format, parseISO } from "date-fns";


const groupBy = <T,>(array: T[], keyGetter: (item: T) => string) => {
  return array.reduce((result: Record<string, T[]>, item) => {
    const key = keyGetter(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
    return result
  }, {})
}


export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [visitorLogs, setVisitorLogs] = useState<any[]>([])
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    checkedOut: 0,
  })


  const volumeData = useMemo(() => {
    const grouped = groupBy(visitors, (v) => format(new Date(v.created_at), "EEE"))
    return Object.entries(grouped).map(([day, v]) => ({ day, count: v.length }))
  }, [visitors])



  const hourlyData = useMemo(() => {
    const grouped = groupBy(visitors, (v) => {
      const time = v.check_in_time ? new Date(v.check_in_time) : null;
      return time ? format(time, "hh a") : "Unknown";
    });

    // Use a map to sort by 24hr internally for correct ordering
    const sorted = Object.entries(grouped)
      .map(([label, v]) => {
        // Parse back 12hr to 24hr hour for sorting
        const tempDate = new Date();
        const parsedHour = new Date(`${tempDate.toDateString()} ${label}`);
        return { label, hour24: parsedHour.getHours(), count: v.length };
      })
      .sort((a, b) => a.hour24 - b.hour24)
      .map(({ label, count }) => ({ hour: label, count }));

    return sorted;
  }, [visitors]);


  const frequentVisitors = useMemo(() => {
    const grouped = groupBy(visitorLogs, (v) => v.visitor?.id || "unknown")

    return Object.entries(grouped)
      .map(([id, logs]) => ({
        id,
        count: logs.length,
        name: logs[0]?.visitor?.name || "Unknown",
        phone: logs[0]?.visitor?.phone || "-",
      }))
      .filter((v) => v.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [visitorLogs])


  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    fetchVisitors()
    fetchVisitorLogs()


    if (!supabase) return

    // Set up real-time subscription
    const channel = supabase
      .channel("visitors-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitors" }, (payload) => {
        console.log("Real-time update:", payload)
        fetchVisitors()
      })
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const filtered = visitors.filter(
      (visitor) =>
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.phone?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredVisitors(filtered)
  }, [visitors, searchTerm])




  const fetchVisitorLogs = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("visitor_logs")
        .select(`
          id,
        visitor_id,
        action,
        timestamp,
        visitor:visitors (
          id,
          name,
          phone,
          email,
          vehicle_number,
          photo_url,
          purpose,
          check_in_time,
          check_out_time,
          status,
          company_name,
          company_address,
          photo_id_type,
          photo_id_number,
          from_date,
          to_date,
          visitor_type,
          assets,
          special_permissions,
          creche,
          remarks
        )
      `)
        .order("timestamp", { ascending: false });

      if (error) throw error;

      console.log("Fetched Visitor Logs:", data); // ✅ Debug
      setVisitorLogs(data || []);
    } catch (error) {
      console.error("Error fetching visitor logs:", error);
    }
  };




  const fetchVisitors = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase.from("visitors").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setVisitors(data || [])

      // Calculate stats
      const total = data?.length || 0
      const checkedIn = data?.filter((v) => v.status === "checked_in").length || 0
      const checkedOut = data?.filter((v) => v.status === "checked_out").length || 0

      setStats({ total, checkedIn, checkedOut })
      console.log("Fetched Visitors:", data);
    } catch (error) {
      console.error("Error fetching visitors:", error)
    }
  }



  const handleCheckOut = async (visitorId: string) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from("visitors")
        .update({
          status: "checked_out",
          check_out_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitorId)

      if (error) throw error

      fetchVisitors()
    } catch (error) {
      console.error("Error checking out visitor:", error)
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



  const AnalyticsSection = ({
    visitors,
    volumeData,
    hourlyData,
    frequentVisitors,
  }: {
    visitors: Visitor[]
    volumeData: { day: string; count: number }[]
    hourlyData: { hour: string; count: number }[]
    frequentVisitors: { id: string; count: number; name?: string }[]
  }) => {

    const visitorTypeCounts = visitors.reduce((acc, visitor) => {
      acc[visitor.visitor_type] = (acc[visitor.visitor_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const visitorTypeData = Object.entries(visitorTypeCounts).map(
      ([type, count]) => ({ name: type, value: count })
    )

    const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#e11d48"]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Visitor Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              width={300}
              height={200}
              data={visitorTypeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </CardContent>

        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visitor Type Pie</CardTitle>
          </CardHeader>
          <CardContent>

            <PieChart width={300} height={200}>
              <Pie
                data={visitorTypeData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {visitorTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>

          </CardContent>
        </Card>
        {/* Daily Volume */}
        <Card>
          <CardHeader><CardTitle>Visitor Volume by Day</CardTitle></CardHeader>
          <CardContent>
            <BarChart width={300} height={200} data={volumeData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
              <Legend />
            </BarChart>

          </CardContent>
        </Card>

        {/* Hourly Check-ins */}
        <Card>
          <CardHeader><CardTitle>Check-in Time hour Distribution</CardTitle></CardHeader>
          <CardContent>
            <BarChart width={300} height={200} data={hourlyData}>
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
              <Legend />
            </BarChart>
          </CardContent>
        </Card>

        {/* Frequent Visitors */}
        <Card>
          <CardHeader><CardTitle>Top Repeat Visitors</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {frequentVisitors.map((v) => (
                <li key={v.id} className="flex items-center space-x-2">
                  <Avatar className="w-6 h-6"><AvatarFallback>{v.name?.[0]}</AvatarFallback></Avatar>
                  <span>{v.name || "Unknown"} — <span className="font-semibold">{v.count}</span> visits</span>
                </li>
              ))}
            </ul>

          </CardContent>
        </Card>

      </div>
    )
  }


  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Configuration Required</h2>
            <p className="text-muted-foreground text-center mb-4">
              Please add Supabase integration to enable the admin dashboard.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50  p-4">
      <Image src="/logo.png" alt="Logo" width={200} height={200} className="mx-auto mb-2" />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Monitor visitor activity in real-time</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Currently Inside</CardTitle>
              <UserCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
              <p className="text-xs text-muted-foreground">Active visitors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
              <Clock className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.checkedOut}</div>
              <p className="text-xs text-muted-foreground">Completed visits</p>
            </CardContent>
          </Card>
        </div>
        <Tabs defaultValue="visitorLogs" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="visitorLogs">Visitor Logs</TabsTrigger>
            <TabsTrigger value="table">Visitor List</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Visitors</CardTitle>
                <CardDescription>All Visitor Details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, vehicle number, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Photo ID Type</TableHead>
                        <TableHead>Photo ID Number</TableHead>
                        <TableHead>Date From</TableHead>
                        <TableHead>Date To</TableHead>
                        <TableHead>Visitor Type</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Status</TableHead>
                        {/* <TableHead>Actions</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVisitors.map((visitor) => (
                        <TableRow key={visitor.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={visitor.photo_url || undefined} />
                                <AvatarFallback>
                                  {visitor.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{visitor.name}</span>
                            </div>
                          </TableCell>
                          <TableCell >{visitor.created_at}</TableCell>
                          <TableCell className="font-mono">{visitor.vehicle_number}</TableCell>
                          <TableCell>{visitor.phone || "-"}</TableCell>
                          <TableCell>{visitor.email || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{visitor.purpose || "-"}</TableCell>
                          <TableCell>{visitor.check_in_time ? formatTime(visitor.check_in_time) : "-"}</TableCell>
                          <TableCell>{visitor.check_out_time ? formatTime(visitor.check_out_time) : "-"}</TableCell>
                          <TableCell>{visitor.company_name || "-"}</TableCell>
                          <TableCell>{visitor.photo_id_type || "-"}</TableCell>
                          <TableCell>{visitor.photo_id_number || "-"}</TableCell>
                          <TableCell>{visitor.from_date || "-"}</TableCell>
                          <TableCell>{visitor.to_date || "-"}</TableCell>
                          <TableCell>{visitor.visitor_type || "-"}</TableCell>
                          <TableCell>{visitor.host || "-"}</TableCell>
                          <TableCell>{visitor.assets?.join(", ") || "-"}</TableCell>
                          <TableCell>{visitor.special_permissions?.join(", ") || "-"}</TableCell>
                          <TableCell>{visitor.remarks || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={visitor.status === "checked_in" ? "default" : "secondary"}>
                              {visitor.status === "checked_in" ? "Inside" : "Left"}
                            </Badge>
                          </TableCell>
                          {/* <TableCell>
                            {visitor.status === "checked_in" && (
                              <Button size="sm" variant="outline" onClick={() => handleCheckOut(visitor.id)}>
                                <LogOut className="w-4 h-4 mr-1" />
                                Check Out
                              </Button>
                            )}
                          </TableCell> */}


                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredVisitors.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No visitors found matching your search." : "No visitors registered yet."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsSection visitors={visitors} volumeData={volumeData}
              hourlyData={hourlyData}
              frequentVisitors={frequentVisitors} />
          </TabsContent>

          <TabsContent value="visitorLogs">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Logs</CardTitle>
                <CardDescription>Log of all entry and exit events</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, vehicle number, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>ID Type</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Visitor Type</TableHead>
                      <TableHead>Assets</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Creche</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Log Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visitorLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={log.visitor.photo_url || undefined} />
                              <AvatarFallback>
                                {log.visitor.name
                                  .split(" ")
                                  .map((n: any) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{log.visitor.name}</span>
                          </div>
                        </TableCell>
                        {/* <TableCell>{log.visitor?.name}</TableCell> */}
                        <TableCell>{log.visitor?.phone}</TableCell>
                        <TableCell>{log.visitor?.email}</TableCell>
                        <TableCell>{log.visitor?.vehicle_number}</TableCell>
                        <TableCell>{log.visitor?.purpose || "-"}</TableCell>
                        <TableCell>{log.visitor?.company_name || "-"}</TableCell>
                        <TableCell>{log.visitor?.check_in_time ? formatTime(log.visitor.check_in_time) : "-"}</TableCell>
                        <TableCell>{log.visitor?.check_out_time ? formatTime(log.visitor.check_out_time) : "-"}</TableCell>
                        <TableCell>{log.visitor?.photo_id_type || "-"}</TableCell>
                        <TableCell>{log.visitor?.photo_id_number || "-"}</TableCell>
                        <TableCell>{log.visitor?.from_date || "-"}</TableCell>
                        <TableCell>{log.visitor?.to_date || "-"}</TableCell>
                        <TableCell>{log.visitor?.visitor_type || "-"}</TableCell>
                        <TableCell>{log.visitor?.assets?.join(", ") || "-"}</TableCell>
                        <TableCell>{log.visitor?.special_permissions?.join(", ") || "-"}</TableCell>
                        <TableCell>{log.visitor?.creche || "-"}</TableCell>
                        <TableCell>{log.visitor?.remarks || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={log.action === "check_in" ? "default" : "secondary"}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.visitor?.remarks || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>

                </Table>
                {visitorLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No logs found.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>

    </div>
  )
}
