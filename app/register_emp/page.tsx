"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Camera, CheckCircle, Upload, AlertCircle, Database, QrCode, Download, Printer, Share, IdCardIcon } from "lucide-react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import Image from 'next/image'


export default function VisitorRegistration() {
    const [formData, setFormData] = useState({
        name: "",
        vehicleNumber: "",
        phone: "",
        email: "",
        purpose: "",
        host: "",
        companyName: "",
        companyAddress: "",
        photoIdType: "",
        photoIdNumber: "",
        fromDate: "",
        toDate: "",
        visitorType: "",
        assets: [] as string[],
        specialPermissions: [] as string[],
        creche: "",
        remarks: "",
    })
    const assetOptions = ["Laptop", "Mobile", "Camera"]
    const permissionOptions = [
        "Plant Access",
        "Canteen Facility",
    ]


    const handleAssetChange = (asset: string) => {
        setFormData((prev) => {
            const assets = prev.assets.includes(asset)
                ? prev.assets.filter((a) => a !== asset)
                : [...prev.assets, asset]

            return { ...prev, assets }
        })
    }

    const handleSpecialPermissionChange = (permission: string) => {
        setFormData((prev) => {
            const updated = prev.specialPermissions.includes(permission)
                ? prev.specialPermissions.filter((p) => p !== permission)
                : [...prev.specialPermissions, permission]

            return { ...prev, specialPermissions: updated }
        })
    }
    const [hostOptions, setHostOptions] = useState<{ id: string; name: string }[]>([])


    useEffect(() => {
        const fetchHosts = async () => {
            if (!supabase) return;

            try {
                const { data, error } = await supabase.from("hosts").select("id, name");

                if (error) {
                    console.error("Error fetching hosts:", error);
                    return;
                }

                setHostOptions(data || []);
            } catch (err) {
                console.error("Unexpected error fetching hosts:", err);
            }
        };

        fetchHosts();
    }, []);


    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            visitorType: "employee"
        }));
    }, []);



    const [photo, setPhoto] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [needsDbSetup, setNeedsDbSetup] = useState(false)
    const [visitorData, setVisitorData] = useState<any>(null)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const router = useRouter()

    const [isSingleDayVisit, setIsSingleDayVisit] = useState(true);

    // Update `toDate` when `fromDate` changes and it's a single-day visit
    useEffect(() => {
        if (isSingleDayVisit && formData.fromDate) {
            setFormData((prev) => ({
                ...prev,
                toDate: prev.fromDate,
            }));
        }
    }, [formData.fromDate, isSingleDayVisit]);


    const generateQRCode = async (visitorId: string, visitorName: string): Promise<string> => {
        try {
            // Create QR code data with visitor information
            const qrData = {
                id: visitorId,
                name: visitorName,
                type: "visitor",
                timestamp: new Date().toISOString(),
                checkoutUrl: `${window.location.origin}/checkout/${visitorId}`,
            }

            // Generate QR code as data URL
            const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
                width: 300,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#FFFFFF",
                },
            })

            return qrCodeDataUrl
        } catch (error) {
            console.error("QR Code generation failed:", error)
            throw error
        }
    }

    const downloadQRCode = () => {
        if (!qrCodeUrl || !visitorData) return

        const link = document.createElement("a")
        link.download = `visitor-qr-${visitorData.name.replace(/\s+/g, "-")}-${visitorData.id.slice(0, 8)}.png`
        link.href = qrCodeUrl
        link.click()
    }

    const shareQRCode = () => {
        if (!qrCodeUrl || !visitorData || !navigator.canShare) return;


        fetch(qrCodeUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `visitor-qr-${visitorData.name.replace(/\s+/g, "-")}-${visitorData.id.slice(0, 8)}.png`, {
                    type: blob.type,
                });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        title: "Visitor QR Code",
                        text: `QR code for ${visitorData.name}`,
                        files: [file],
                    });
                } else {
                    alert("Sharing is not supported on this device.");
                }
            })
            .catch(err => {
                console.error("Error sharing QR code:", err);
            });
    };


    const printQRCode = () => {
        if (!qrCodeUrl || !visitorData) return

        const printWindow = window.open("", "_blank")
        if (printWindow) {
            printWindow.document.write(`
        <html>
          <head>
            <title>Visitor QR Code - ${visitorData.name}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
              }
              .qr-container {
                border: 2px solid #000;
                padding: 20px;
                margin: 20px auto;
                width: fit-content;
                border-radius: 10px;
              }
              .visitor-info {
                margin-bottom: 20px;
              }
              .visitor-info h2 {
                margin: 0 0 10px 0;
                color: #333;
              }
              .visitor-info p {
                margin: 5px 0;
                color: #666;
              }
              .qr-code {
                margin: 20px 0;
              }
              .instructions {
                margin-top: 20px;
                font-size: 12px;
                color: #888;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="visitor-info">
                <h2>${visitorData.name}</h2>
                <p><strong>Vehicle:</strong> ${visitorData.vehicle_number}</p>
                <p><strong>Check-in:</strong> ${new Date(visitorData.check_in_time).toLocaleString()}</p>
                <p><strong>ID:</strong> ${visitorData.id}</p>
              </div>
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="Visitor QR Code" />
              </div>
              <div class="instructions">
                <p>Scan this QR code for quick check-out</p>
              </div>
            </div>
          </body>
        </html>
      `)
            printWindow.document.close()
            printWindow.print()
        }
    }

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ""
        const [y, m, d] = dateStr.split("-")
        return `${d}-${m}-${y}`
    }



    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                setError("Photo size must be less than 5MB")
                return
            }

            // Validate file type
            if (!file.type.startsWith("image/")) {
                setError("Please select a valid image file")
                return
            }

            setPhoto(file)
            const reader = new FileReader()
            reader.onload = (e) => {
                setPhotoPreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
            setError(null)
        }
    }

    const createDatabaseTable = async (): Promise<boolean> => {
        if (!supabase) return false

        try {
            // Create the visitors table
            const { error } = await supabase.rpc("exec_sql", {
                sql: `
          CREATE TABLE IF NOT EXISTS visitors (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            vehicle_number VARCHAR(20) NOT NULL,
            phone VARCHAR(15),
            purpose TEXT,
            photo_url TEXT,
            check_in_time TIMESTAMP WITH TIME ZONE,
            check_out_time TIMESTAMP WITH TIME ZONE,
            status VARCHAR(20) DEFAULT 'checked_in',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
          CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(created_at);

          -- Enable RLS
          ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

          -- Create policy
          DROP POLICY IF EXISTS "Allow all operations on visitors" ON visitors;
          CREATE POLICY "Allow all operations on visitors" ON visitors
            FOR ALL USING (true);
        `,
            })

            if (error) {
                console.error("Failed to create table via RPC:", error)
                return false
            }

            return true
        } catch (error) {
            console.error("Database table creation failed:", error)
            return false
        }
    }

    const checkDatabaseSetup = async (): Promise<boolean> => {
        if (!supabase) return false

        try {
            // Try to query the visitors table to check if it exists
            const { error } = await supabase.from("visitors").select("id").limit(1)

            if (error) {
                console.error("Database check error:", error)
                // Check if it's a table not found error
                if (error.message.includes("relation") && error.message.includes("does not exist")) {
                    return false
                }
            }
            return true
        } catch (error) {
            console.error("Database setup check failed:", error)
            return false
        }
    }

    const uploadPhoto = async (file: File): Promise<string | null> => {
        if (!supabase) return null

        try {
            const fileExt = file.name.split(".").pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `visitor-photos/${fileName}`

            // First, try to check if bucket exists and create if it doesn't
            const { data: buckets, error: listError } = await supabase.storage.listBuckets()

            if (listError) {
                console.warn("Could not check storage buckets:", listError)
                return null
            }



            const { error: uploadError } = await supabase.storage.from("visitor-photos").upload(filePath, file)

            if (uploadError) {
                console.warn("Upload error:", uploadError)
                return null
            }

            const { data } = supabase.storage.from("visitor-photos").getPublicUrl(filePath)

            return data.publicUrl
        } catch (error) {
            console.warn("Photo upload failed:", error)
            return null
        }
    }

    const handleSetupDatabase = async () => {
        setIsSubmitting(true)
        setError(null)

        try {
            const success = await createDatabaseTable()
            if (success) {
                setNeedsDbSetup(false)
                setError(null)
                alert("Database setup completed successfully! You can now register visitors.")
            } else {
                setError("Failed to set up database. Please try running the SQL script manually.")
            }
        } catch (error) {
            console.error("Database setup failed:", error)
            setError("Database setup failed. Please check your permissions or run the SQL script manually.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!supabase) {
            setError("Supabase not configured. Please add integration.")
            return
        }

        // Validate required fields
        if (!formData.name.trim()) {
            setError("Name is required")
            return
        }

        if (!formData.vehicleNumber.trim()) {
            setError("Vehicle number is required")
            return
        }

        if (!formData.phone.trim()) {
            setError("Phone number is required")
            return
        }

        if (!formData.purpose.trim()) {
            setError("Purpose of visit is required")
            return
        }

        if (!photo) {
            setError("Photo is required")
            return
        }


        if (!formData.email.trim()) {
            setError("Email id is required")
            return
        }

        if (!formData.host.trim()) {
            setError("Host is required")
            return
        }

        // Validate vehicle number format (basic Indian format)
        const vehicleRegex = /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/i
        if (!vehicleRegex.test(formData.vehicleNumber.replace(/\s/g, ""))) {
            setError("Please enter a valid Indian vehicle number (e.g., MH 01 AB 1234)")
            return
        }

        setIsSubmitting(true)

        try {
            // Check if database is set up
            const isDatabaseReady = await checkDatabaseSetup()
            if (!isDatabaseReady) {
                setNeedsDbSetup(true)
                setError("Database table not found. Please set up the database first.")
                return
            }

            let photoUrl = null
            let photoUploadFailed = false

            if (photo) {
                photoUrl = await uploadPhoto(photo)
                if (!photoUrl) {
                    photoUploadFailed = true
                }
            }

            // Prepare visitor data
            const newVisitorData = {
                name: formData.name.trim(),
                vehicle_number: formData.vehicleNumber.toUpperCase().replace(/\s/g, ""),
                phone: formData.phone.trim(),
                email: formData.email.trim(),
                purpose: formData.purpose.trim(),
                host: formData.host,
                photo_url: photoUrl,
                company_name: formData.companyName,
                company_address: formData.companyAddress,
                photo_id_type: formData.photoIdType,
                photo_id_number: formData.photoIdNumber,
                from_date: formData.fromDate,
                to_date: formData.toDate,
                visitor_type: formData.visitorType,
                assets: formData.assets,
                special_permissions: formData.specialPermissions,
                creche: formData.creche,
                remarks: formData.remarks,
                status: "registered",
            }


            console.log("Inserting visitor data:", newVisitorData)

            const { data, error } = await supabase.from("visitors").insert([newVisitorData]).select()

            if (error) {
                console.error("Database insert error:", error)
                throw new Error(`Database error: ${error.message}`)
            }

            if (!data || data.length === 0) {
                throw new Error("No data returned from database")
            }

            const insertedVisitor = data[0]
            const insertedVisitor1 = data[0]
            insertedVisitor1.host = hostOptions.find(h => h.id === insertedVisitor1.host);
            console.log(insertedVisitor1)
            // Generate QR code for the visitor
            try {
                const qrCode = await generateQRCode(insertedVisitor.id, insertedVisitor.name)
                setQrCodeUrl(qrCode)
                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitorData: insertedVisitor1, qrCodeUrl: qrCode.replace(/^data:image\/\w+;base64,/, '') }),
                });
            } catch (qrError) {
                console.error("QR code generation failed:", qrError)
                // Continue without QR code
            }

            console.log("insertedVisitor: ", insertedVisitor)


            setVisitorData(insertedVisitor)

            setIsSuccess(true)


            // Show warning if photo upload failed but registration succeeded
            if (photoUploadFailed) {
                setTimeout(() => {
                    alert("Registration successful! Note: Photo upload failed - storage bucket may need setup.")
                }, 500)
            }
        } catch (error) {
            console.error("Registration failed:", error)
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
            setError(`Registration failed: ${errorMessage}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleNewRegistration = () => {
        setIsSuccess(false)
        setVisitorData(null)
        setQrCodeUrl(null)
        setFormData({ name: "", vehicleNumber: "", phone: "", email: "", purpose: "", host: "", assets: [], companyAddress: '', companyName: "", creche: '', fromDate: '', photoIdNumber: '', photoIdType: '', remarks: '', specialPermissions: [], toDate: '', visitorType: '' })
        setPhoto(null)
        setPhotoPreview(null)

    }

    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-2">Configuration Required</h2>
                        <p className="text-muted-foreground text-center mb-4">
                            Please add Supabase integration to enable visitor registration.
                        </p>
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Refresh Page
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }



    if (isSuccess && visitorData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-center mb-2">Registration Successful!</h2>
                        <p className="text-muted-foreground text-center mb-4">Welcome! Your visit has been logged.</p>

                        <div className="w-full space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">Visitor Details</h3>
                                <p className="text-sm">
                                    <strong>Name:</strong> {visitorData.name}
                                </p>
                                <p className="text-sm">
                                    <strong>Vehicle:</strong> {visitorData.vehicle_number}
                                </p>
                                <p className="text-sm">
                                    <strong>ID:</strong> {visitorData.id}
                                </p>
                                <p className="text-sm">
                                    <strong>Created At:</strong> {new Date(visitorData.created_at).toLocaleString()}
                                </p>
                                <p className="text-sm">
                                    <strong>Date:</strong> {formatDate(visitorData.from_date)}
                                    {!isSingleDayVisit && (
                                        <>
                                            {" "}
                                            <strong> to </strong> {formatDate(visitorData.to_date)}
                                        </>
                                    )}
                                </p>

                                <p className="text-sm">
                                    {(() => {
                                        const host = visitorData.host;
                                        return (
                                            <p>
                                                <strong>Host:</strong> {host ? `${host.id} ~ ${host.name}` : "Unknown"}
                                            </p>
                                        );
                                    })()}

                                </p>
                            </div>

                            {qrCodeUrl && (
                                <div className="text-center">
                                    <h3 className="font-semibold mb-2 flex items-center justify-center">
                                        <QrCode className="w-4 h-4 mr-2" />
                                        Your QR Code
                                    </h3>
                                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                                        <img src={qrCodeUrl || "/placeholder.svg"} alt="Visitor QR Code" className="mx-auto" />
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button onClick={downloadQRCode} variant="outline" size="sm" className="flex-1 bg-transparent">
                                            <Download className="w-4 h-4 mr-1" />
                                            Download
                                        </Button>
                                        <Button onClick={printQRCode} variant="outline" size="sm" className="flex-1 bg-transparent">
                                            <Printer className="w-4 h-4 mr-1" />
                                            Print
                                        </Button>
                                        <Button
                                            onClick={shareQRCode}
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 bg-transparent"
                                        >
                                            <Share className="w-4 h-4 mr-1" />
                                            Share
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Button onClick={handleNewRegistration} className="w-full">
                                Register Another Visitor
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div >
        )
    }

    return (

        <div className="min-h-screen bg-gradient-to-br from-blue-200 to-indigo-500  flex items-center flex-col justify-center p-4">
            <Card className="w-full max-w-5xl bg-white shadow-xl rounded-xl border border-gray-200 p-6">
                <Image src="/logo.png" alt="Logo" width={200} height={200} className="mx-auto mb-2" />
                <CardHeader className="text-center mb-6">
                    <CardTitle className="text-3xl font-bold text-indigo-700">Visitor Registration (Employee)</CardTitle>
                    <CardDescription className="text-gray-600">Please fill in your details to register your visit</CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Section: Personal Information */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Enter your full name" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                                    <Input id="vehicleNumber" name="vehicleNumber" required value={formData.vehicleNumber} onChange={handleInputChange} className="uppercase" placeholder="e.g., MH 01 AB 1234" />
                                </div>
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="phone">Phone Number (+91) *</Label>
                                <Input id="phone" name="phone" required type="tel" value={formData.phone} onChange={handleInputChange} placeholder="Enter your phone number" />
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="phone">Email ID *</Label>
                                <Input id="email" name="email" required type="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your Email ID" />
                            </div>
                        </section>

                        {/* Section: Visit Details */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Visit Details</h3>
                            <div className="space-y-2">
                                <Label htmlFor="purpose">Purpose of Visit *</Label>
                                <Textarea id="purpose" name="purpose" required value={formData.purpose} onChange={handleInputChange} placeholder="Brief description of your visit" rows={3} />
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="host">Host *</Label>
                                <select id="host" name="host" required value={formData.host} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                                    <option value="">Select a host</option>
                                    {hostOptions.map((host) => (
                                        <option key={host.id} value={host.id}>
                                            {host.id} ~ {host.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </section>

                        {/* Section: Company */}
                        {/* <section className="p-4 border rounded-md bg-gray-50 ">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Company</h3>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Company Name" />
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Textarea name="companyAddress" value={formData.companyAddress} onChange={handleInputChange} rows={2} placeholder="Company full address" />
              </div>
            </section> */}

                        {/* Section: Identity Proof */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Identity Proof</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="photoIdType">Photo ID Type</Label>
                                    <select id="photoIdType" name="photoIdType" value={formData.photoIdType} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">
                                        <option value="">Select ID type</option>
                                        <option value="aadhaar">Aadhaar</option>
                                        <option value="pan">PAN</option>
                                        <option value="driver_license">Driver’s License</option>
                                        <option value="voter_id">Voter ID</option>
                                        <option value="passport">Passport</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="photoIdNumber">Photo ID Number</Label>
                                    <Input name="photoIdNumber" value={formData.photoIdNumber} onChange={handleInputChange} />
                                </div>
                            </div>
                        </section>

                        {/* Section: Visit Duration */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4">Visit Duration</h3>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="visitType" value="single" checked={isSingleDayVisit} onChange={() => setIsSingleDayVisit(true)} className="accent-indigo-600" />
                                    <span className="text-sm">Single Day</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="visitType" value="multiple" checked={!isSingleDayVisit} onChange={() => setIsSingleDayVisit(false)} className="accent-indigo-600" />
                                    <span className="text-sm">Multiple Days</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {isSingleDayVisit ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="fromDate">Date</Label>
                                        <Input type="date" name="fromDate" value={formData.fromDate} onChange={handleInputChange} />
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="fromDate">From Date</Label>
                                            <Input type="date" name="fromDate" value={formData.fromDate} onChange={handleInputChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="toDate">To Date</Label>
                                            <Input type="date" name="toDate" value={formData.toDate} onChange={handleInputChange} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Section: Visitor Type */}
                        {/* <section className="p-4 border rounded-md bg-gray-50 ">
                            <div className="space-y-2">
                                <Label className="text-lg font-semibold text-gray-700 mb-4" htmlFor="visitorType">Visitor Type</Label>
                                <select name="visitorType" value={formData.visitorType} onChange={handleInputChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white">

                                    <option value="employee">Employee</option>

                                </select>
                            </div>
                        </section> */}

                        {/* Section: Assets */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <div >
                                <Label className="text-lg font-semibold text-gray-700 mb-4">Assets to Bring</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {assetOptions.map((asset) => (
                                        <label key={asset} className="flex items-center space-x-2">
                                            <input type="checkbox" value={asset} checked={formData.assets.includes(asset)} onChange={() => handleAssetChange(asset)} className="accent-indigo-600" />
                                            <span className="text-sm">{asset}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Section: Special Permissions */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <div >
                                <Label className="text-lg font-semibold text-gray-700 mb-4">Special Permissions</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {permissionOptions.map((permission) => (
                                        <label key={permission} className="flex items-center space-x-2">
                                            <input type="checkbox" value={permission} checked={formData.specialPermissions.includes(permission)} onChange={() => handleSpecialPermissionChange(permission)} className="accent-indigo-600" />
                                            <span className="text-sm">{permission}</span>
                                        </label>
                                    ))}
                                </div>
                                {/* Section: Creche */}
                                <div className="space-y-2">
                                    <input type="checkbox" id="creche" name="creche" checked={formData.creche === "yes"} onChange={(e) => setFormData((prev) => ({ ...prev, creche: e.target.checked ? "yes" : "no" }))} className="accent-indigo-600" />
                                    <Label className="ml-2" htmlFor="creche">Creche Required</Label>
                                </div>
                            </div>
                        </section>



                        {/* Section: Additional Remarks */}
                        <div className="space-y-2">
                            <Label className="text-lg font-semibold text-gray-700 mb-4" htmlFor="remarks">Additional Remarks</Label>
                            <Textarea name="remarks" value={formData.remarks} onChange={handleInputChange} rows={2} placeholder="Any special instructions or comments" />
                        </div>

                        {/* Section: Photo Upload */}
                        <section className="p-4 border rounded-md bg-gray-50 ">
                            <Label htmlFor="photo">Photo *</Label>
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" required />
                                    <Button type="button" variant="ghost" onClick={() => document.getElementById("photo")?.click()} className="w-full bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 text-indigo-700">
                                        <Camera className="w-4 h-4 mr-2" />
                                        {photo ? "Change Photo" : "Upload Photo *"}
                                    </Button>
                                </div>
                                {photoPreview && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden border">
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Submit Button */}
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting || !formData.name || !formData.vehicleNumber || !formData.phone || !formData.purpose || !photo || !formData.email}>
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                                    Registering...
                                </span>
                            ) : (
                                "Register Visit"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

    )
}
