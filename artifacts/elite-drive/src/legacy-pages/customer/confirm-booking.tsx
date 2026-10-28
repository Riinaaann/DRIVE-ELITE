import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { getGetVehicleQueryKey, useGetVehicle, useCreateBooking } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RazorpayCheckoutModal } from "@/components/razorpay-checkout-modal";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  User,
  Phone,
  Mail,
  CreditCard as IdCard,
  MapPin,
  AlertTriangle,
  Calendar,
  Lock,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI (Razorpay)", desc: "GPay, PhonePe, Paytm, QR Code", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card (Razorpay)", desc: "Visa, Mastercard, RuPay with 3D Secure", icon: CreditCard },
  { id: "netbanking", label: "Net Banking (Razorpay)", desc: "All Indian banks with instant verification", icon: Building2 },
  { id: "cash", label: "Cash at Pickup", desc: "Pay in person at the counter", icon: Wallet },
];

export default function ConfirmBooking() {
  const [, params] = useRoute("/vehicles/:id/confirm");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [details, setDetails] = useState({
    fullName: user?.name || "",
    age: "",
    phone: "",
    email: user?.email || "",
    licenseNumber: "",
    licenseExpiry: "",
    address: "",
    emergencyName: "",
    emergencyPhone: "",
  });

  const searchParams = new URLSearchParams(window.location.search);
  const pickupDate = searchParams.get("pickup") || "";
  const returnDate = searchParams.get("return") || "";

  const { data: vehicle, isLoading } = useGetVehicle(id, { query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) } });
  const createBookingMutation = useCreateBooking();

  if (isLoading || !vehicle) return <div className="p-8 text-center">Loading...</div>;

  if (!pickupDate || !returnDate) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive mb-4">Missing dates for booking.</p>
        <Link href={`/vehicles/${id}/book`}><Button variant="outline">Go back</Button></Link>
      </div>
    );
  }

  const dPickup = parseISO(pickupDate);
  const dReturn = parseISO(returnDate);
  const duration = Math.max(1, differenceInDays(dReturn, dPickup));
  const totalCost = duration * Number(vehicle.dailyRate);

  const detailsComplete =
    details.fullName.trim() &&
    details.age &&
    parseInt(details.age) >= 18 &&
    details.phone.trim().length >= 10 &&
    details.email.trim() &&
    details.licenseNumber.trim() &&
    details.licenseExpiry &&
    details.address.trim() &&
    details.emergencyName.trim() &&
    details.emergencyPhone.trim().length >= 10;

  const canConfirm = detailsComplete && !!paymentMethod;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDetails((prev) => ({ ...prev, [field]: e.target.value }));

  const handleConfirm = () => {
    if (!canConfirm) return;

    if (paymentMethod === "cash") {
      createBookingMutation.mutate(
        { data: { vehicleId: vehicle.id, pickupDate, returnDate } },
        {
          onSuccess: () => {
            toast({ title: "Booking Confirmed!", description: "Your reservation has been created. Pay in cash at the counter." });
            queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
            queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
            setLocation("/my-bookings");
          },
          onError: (err: any) => {
            toast({
              title: "Booking Failed",
              description: err?.data?.error || "Could not complete the booking.",
              variant: "destructive",
            });
          },
        }
      );
    } else {
      // Open Razorpay Secure Gateway Checkout Modal
      setIsPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = (booking: any, payment: any) => {
    toast({
      title: "Payment & Reservation Confirmed!",
      description: `Payment ID ${payment.paymentId} verified. Booking #${booking.id} is confirmed.`,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    setLocation("/my-bookings");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href={`/vehicles/${id}/book`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dates
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Confirm Reservation</h1>
        <p className="text-muted-foreground mt-1">Fill in your details, choose a payment method and confirm</p>
      </div>

      <div className="space-y-6">
        {/* Vehicle Summary */}
        <Card className="border-border/60 overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 bg-muted aspect-video md:aspect-auto flex items-center justify-center">
              {vehicle.imageUrl ? (
                <img src={vehicle.imageUrl} alt="" className="object-cover w-full h-full" />
              ) : (
                <span className="font-bold text-xl text-primary/40 uppercase tracking-widest">{vehicle.make}</span>
              )}
            </div>
            <div className="p-6 md:w-2/3 flex flex-col justify-center">
              <h2 className="text-2xl font-bold">{vehicle.make} {vehicle.model}</h2>
              <p className="text-muted-foreground mb-4">{vehicle.year} • {vehicle.category}</p>
              <div className="grid grid-cols-2 gap-4 text-sm mt-auto pt-4 border-t border-border/40">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Pick-up</p>
                  <p className="font-medium">{format(dPickup, "EEE, MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Return</p>
                  <p className="font-medium">{format(dReturn, "EEE, MMM d, yyyy")}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer Details */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Customer Details
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Required for rental agreement and verification
            </p>

            <div className="space-y-5">
              {/* Row 1: Full Name + Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="fullName" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="As on driving licence"
                    value={details.fullName}
                    onChange={set("fullName")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    min={18}
                    max={80}
                    placeholder="Min. 18"
                    value={details.age}
                    onChange={set("age")}
                    required
                  />
                  {details.age && parseInt(details.age) < 18 && (
                    <p className="text-xs text-destructive">Must be 18 or older</p>
                  )}
                </div>
              </div>

              {/* Row 2: Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={details.phone}
                    onChange={set("phone")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={details.email}
                    onChange={set("email")}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Licence No + Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="licenseNumber" className="flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-muted-foreground" /> Driving Licence No.
                  </Label>
                  <Input
                    id="licenseNumber"
                    placeholder="e.g. KL01 20110012345"
                    value={details.licenseNumber}
                    onChange={set("licenseNumber")}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="licenseExpiry" className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Licence Expiry Date
                  </Label>
                  <Input
                    id="licenseExpiry"
                    type="date"
                    min={format(new Date(), "yyyy-MM-dd")}
                    value={details.licenseExpiry}
                    onChange={set("licenseExpiry")}
                    required
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Residential Address
                </Label>
                <Input
                  id="address"
                  placeholder="House No., Street, City, State, PIN"
                  value={details.address}
                  onChange={set("address")}
                  required
                />
              </div>

              {/* Row 5: Emergency Contact */}
              <div className="pt-2 border-t border-border/40">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input
                      id="emergencyName"
                      placeholder="Full name"
                      value={details.emergencyName}
                      onChange={set("emergencyName")}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyPhone">Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={details.emergencyPhone}
                      onChange={set("emergencyPhone")}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="border-border/60">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Method
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select how you'd like to pay for this booking
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const selected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn("font-semibold text-sm", selected && "text-primary")}>{method.label}</p>
                      <p className="text-xs text-muted-foreground">{method.desc}</p>
                    </div>
                    {selected && <CheckCircle2 className="h-5 w-5 text-primary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary + Confirm */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-primary" /> Included Benefits
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Comprehensive Insurance Coverage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>24/7 Roadside Assistance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Free cancellation up to 48h before</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60 border-primary/20 shadow-sm shadow-primary/5">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-lg">Price Breakdown</h3>
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    ₹{Number(vehicle.dailyRate).toLocaleString("en-IN")} × {duration} days
                  </span>
                  <span>₹{totalCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST & Taxes</span>
                  <span>Included</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Total</span>
                <span className="text-3xl font-bold text-primary tracking-tight">
                  ₹{totalCost.toLocaleString("en-IN")}
                </span>
              </div>

              {!canConfirm && (
                <p className="text-xs text-muted-foreground text-center mb-3">
                  {!detailsComplete
                    ? "Please complete all customer details above"
                    : "Please select a payment method"}
                </p>
              )}

              <Button
                onClick={handleConfirm}
                className={cn(
                  "w-full font-bold h-12 text-base transition-all",
                  paymentMethod !== "cash" && canConfirm ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" : ""
                )}
                disabled={createBookingMutation.isPending || !canConfirm}
              >
                {createBookingMutation.isPending ? (
                  "Confirming..."
                ) : canConfirm ? (
                  paymentMethod === "cash" ? (
                    "Confirm Reservation (Pay at Pickup)"
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Pay ₹{totalCost.toLocaleString("en-IN")} via Razorpay
                    </span>
                  )
                ) : (
                  "Complete Details to Continue"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Razorpay Secure Gateway Modal */}
      <RazorpayCheckoutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        vehicle={vehicle}
        pickupDate={pickupDate}
        returnDate={returnDate}
        duration={duration}
        totalCost={totalCost}
        customerDetails={details}
        preferredMethod={paymentMethod}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
