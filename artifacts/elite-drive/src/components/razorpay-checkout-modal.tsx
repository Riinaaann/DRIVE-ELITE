import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Smartphone,
  CreditCard,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
  QrCode,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: any;
  pickupDate: string;
  returnDate: string;
  duration: number;
  totalCost: number;
  customerDetails: {
    fullName: string;
    phone: string;
    email: string;
  };
  preferredMethod?: string;
  onSuccess: (booking: any, payment: any) => void;
}

const POPULAR_BANKS = [
  { id: "hdfc", name: "HDFC Bank", code: "HDFC" },
  { id: "sbi", name: "State Bank of India", code: "SBIN" },
  { id: "icici", name: "ICICI Bank", code: "ICIC" },
  { id: "axis", name: "Axis Bank", code: "UTIB" },
  { id: "kotak", name: "Kotak Mahindra Bank", code: "KKBK" },
];

export function RazorpayCheckoutModal({
  isOpen,
  onClose,
  vehicle,
  pickupDate,
  returnDate,
  duration,
  totalCost,
  customerDetails,
  preferredMethod = "upi",
  onSuccess,
}: RazorpayModalProps) {
  const [activeTab, setActiveTab] = useState<"upi" | "card" | "netbanking">(
    preferredMethod === "card" ? "card" : preferredMethod === "netbanking" ? "netbanking" : "upi"
  );

  const [orderData, setOrderData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("4532 8920 1124 5683");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("892");
  const [cardHolder, setCardHolder] = useState(customerDetails.fullName || "Muhammed Rinan");

  // UPI state
  const [upiId, setUpiId] = useState(`${customerDetails.phone || "9876543210"}@upi`);
  const [selectedBank, setSelectedBank] = useState("hdfc");

  // 3D Secure / OTP Screen state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState("749210");
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize Razorpay Order on Open
  useEffect(() => {
    if (isOpen) {
      initiateOrder();
      setShowOtpScreen(false);
      setIsSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen, vehicle?.id]);

  const initiateOrder = async () => {
    setIsInitializing(true);
    setErrorMessage("");
    try {
      const token = localStorage.getItem("elite_drive_token");
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          pickupDate,
          returnDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrderData(data);
      } else {
        // Fallback demo order
        setOrderData({
          orderId: `order_demo_${Date.now()}`,
          totalCost,
          isDemoMode: true,
        });
      }
    } catch {
      // Fallback demo order
      setOrderData({
        orderId: `order_demo_${Date.now()}`,
        totalCost,
        isDemoMode: true,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const paymentId = `pay_demo_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      const token = localStorage.getItem("elite_drive_token");

      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: orderData?.orderId || `order_${Date.now()}`,
          razorpay_payment_id: paymentId,
          razorpay_signature: `demo_sig_${Date.now()}`,
          vehicleId: vehicle.id,
          pickupDate,
          returnDate,
          paymentMethod: `Instant Demo - ${activeTab.toUpperCase()}`,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment processing could not be completed.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(verifyData.booking, verifyData.payment);
        onClose();
      }, 1200);

    } catch (err: any) {
      setErrorMessage(err.message || "Could not complete transaction. Please try again.");
      setIsProcessing(false);
      setShowOtpScreen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/80 rounded-2xl shadow-2xl">
        
        {/* Brand Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide">Razorpay Gateway</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  <ShieldCheck className="h-3 w-3 mr-0.5" /> SECURE 256-BIT
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Merchant: Elite Drive Luxury Rentals</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase font-medium">Amount Due</span>
            <p className="text-lg font-black text-emerald-400">₹{totalCost.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/40 px-4 py-2 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="font-medium">Instant Demo Mode Active</span>
          </div>
          <span className="text-[11px] opacity-80">Auto-approves without real card</span>
        </div>

        {/* Loading state */}
        {isInitializing ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">Initiating Gateway Session...</p>
            <p className="text-xs text-muted-foreground">Preparing Instant Demo Checkout</p>
          </div>
        ) : isSuccess ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-75">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Payment Approved!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your reservation has been locked and confirmed.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-xs space-y-1.5 text-left border border-border/40 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-semibold">{orderData?.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{totalCost.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-emerald-600 font-semibold">PAID & CONFIRMED</span>
              </div>
            </div>
          </div>
        ) : showOtpScreen ? (
          /* 3D Secure OTP Step */
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">Bank 3D-Secure Authentication</span>
              </div>
              <Badge variant="outline" className="text-xs">OTP Step</Badge>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3.5 text-xs text-blue-800 dark:text-blue-300">
              An authentication code has been simulated for your payment method.
            </div>

            <div className="space-y-2">
              <Label htmlFor="otpInput" className="text-xs font-semibold">6-Digit OTP</Label>
              <Input
                id="otpInput"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center font-mono tracking-widest text-lg font-bold h-11"
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Demo OTP: <strong>749210</strong> (pre-filled)
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
                onClick={() => setShowOtpScreen(false)}
              >
                Back
              </Button>
              <Button
                className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isProcessing || otp.length < 4}
                onClick={handleProcessPayment}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Approving...
                  </>
                ) : (
                  "Approve & Confirm"
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Payment Methods Selection */
          <div className="p-6 space-y-5">
            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-muted/60 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("upi")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all",
                  activeTab === "upi"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" /> UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all",
                  activeTab === "card"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CreditCard className="h-3.5 w-3.5" /> Card
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("netbanking")}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all",
                  activeTab === "netbanking"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 className="h-3.5 w-3.5" /> Net Banking
              </button>
            </div>

            {/* TAB: UPI */}
            {activeTab === "upi" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-4 bg-muted/30 border border-border/60 rounded-xl text-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm mb-2 border border-slate-200">
                    <QrCode className="h-28 w-28 text-slate-900" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Scan with any UPI App</p>
                  <p className="text-[11px] text-muted-foreground">Google Pay, PhonePe, Paytm, BHIM</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upiInput" className="text-xs font-medium">Or UPI ID / VPA</Label>
                  <Input
                    id="upiInput"
                    placeholder="mobile@upi or id@oksbi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB: Card */}
            {activeTab === "card" && (
              <div className="space-y-4">
                {/* Visual Card Representation */}
                <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-700/60 text-xs space-y-3 font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>ELITE DRIVE MEMBER</span>
                    <span className="font-bold tracking-widest text-white">VISA</span>
                  </div>
                  <div className="text-base tracking-widest font-bold pt-1">
                    {cardNumber}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-sans">Cardholder</p>
                      <p className="font-sans font-semibold">{cardHolder}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-sans">Expires</p>
                      <p>{cardExpiry}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <Label htmlFor="cnum" className="text-xs">Card Number</Label>
                    <Input
                      id="cnum"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="font-mono text-xs h-9 mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="cexp" className="text-xs">Valid Thru</Label>
                      <Input
                        id="cexp"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="font-mono text-xs h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ccvv" className="text-xs">CVV</Label>
                      <Input
                        id="ccvv"
                        type="password"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="font-mono text-xs h-9 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Net Banking */}
            {activeTab === "netbanking" && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Select your Bank</Label>
                <div className="grid grid-cols-1 gap-2">
                  {POPULAR_BANKS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBank(b.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left",
                        selectedBank === b.id
                          ? "border-primary bg-primary/5 text-primary font-bold"
                          : "border-border/60 hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{b.name}</span>
                      </div>
                      {selectedBank === b.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={() => {
                  if (activeTab === "upi") {
                    handleProcessPayment();
                  } else {
                    setShowOtpScreen(true);
                  }
                }}
                className="w-full h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <span>Pay ₹{totalCost.toLocaleString("en-IN")} via Demo Gateway</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-2.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>Instant Demo Gateway • No real money charged</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
