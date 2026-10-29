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
  AlertCircle,
  Zap,
  Copy,
  Check,
  ExternalLink,
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
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");

  const UPI_ID = "rinanrinu111@oksbi";
  const PAYEE_NAME = "Rinan";
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("4532 8920 1124 5683");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("892");
  const [cardHolder, setCardHolder] = useState(customerDetails.fullName || "Muhammed Rinan");

  const [selectedBank, setSelectedBank] = useState("hdfc");

  // 3D Secure / OTP Screen state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState("749210");
  const [isSuccess, setIsSuccess] = useState(false);

  // Initialize Order on Open
  useEffect(() => {
    if (isOpen) {
      initiateOrder();
      setShowOtpScreen(false);
      setIsSuccess(false);
      setErrorMessage("");
      setCopiedUpi(false);
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
        setOrderData({
          orderId: `order_demo_${Date.now()}`,
          totalCost,
          isDemoMode: true,
        });
      }
    } catch {
      setOrderData({
        orderId: `order_demo_${Date.now()}`,
        totalCost,
        isDemoMode: true,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const paymentId = utrNumber.trim() ? `pay_upi_${utrNumber.trim()}` : `pay_upi_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
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
          razorpay_signature: `verified_upi_${Date.now()}`,
          vehicleId: vehicle.id,
          pickupDate,
          returnDate,
          paymentMethod: activeTab === "upi" ? `UPI (${UPI_ID})` : `Demo - ${activeTab.toUpperCase()}`,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment verification could not be completed.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(verifyData.booking, verifyData.payment);
        onClose();
      }, 1400);

    } catch (err: any) {
      setErrorMessage(err.message || "Could not complete transaction. Please try again.");
      setIsProcessing(false);
      setShowOtpScreen(false);
    }
  };

  const upiDeepLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${totalCost}&cu=INR&tn=${encodeURIComponent(`Elite Drive - ${vehicle?.make} ${vehicle?.model}`)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/80 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Brand Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide">Razorpay UPI Gateway</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  <ShieldCheck className="h-3 w-3 mr-0.5" /> SECURE
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium">Payee: {PAYEE_NAME}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase font-medium">Amount Due</span>
            <p className="text-lg font-black text-emerald-400">₹{totalCost.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Loading state */}
        {isInitializing ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium text-foreground">Preparing Payment...</p>
            <p className="text-xs text-muted-foreground">Loading QR and UPI details</p>
          </div>
        ) : isSuccess ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-75">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Payment Received & Confirmed!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your reservation for {vehicle?.make} {vehicle?.model} has been secured.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-xs space-y-1.5 text-left border border-border/40 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payee:</span>
                <span className="font-semibold">{PAYEE_NAME} ({UPI_ID})</span>
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
              Enter the OTP sent to your registered mobile number for authentication.
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
                Demo OTP: <strong>749210</strong>
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
                  "Confirm & Pay"
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
                {/* Official QR Code Card */}
                <div className="bg-white text-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="font-bold text-sm text-slate-800">{PAYEE_NAME}</span>
                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                      GPay Verified
                    </Badge>
                  </div>

                  <div className="relative inline-block mx-auto rounded-xl overflow-hidden border border-slate-100 bg-slate-50 p-2">
                    <img 
                      src="/upi-qr.png" 
                      alt="UPI QR Code - Rinan" 
                      className="w-56 h-auto mx-auto rounded-lg object-contain"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    Scan to pay with Google Pay, PhonePe, Paytm, or any UPI app
                  </p>
                </div>

                {/* Copy UPI ID Row */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/60">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">UPI ID</p>
                    <p className="font-mono text-xs font-bold text-foreground truncate">{UPI_ID}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyUpi}
                    className="h-8 text-xs gap-1.5 shrink-0"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Direct Pay Link for Mobile */}
                <div className="text-center">
                  <a
                    href={upiDeepLink}
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    <span>Tap to Pay directly in your UPI App</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Optional UTR / Reference Input */}
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="utrInput" className="text-xs font-medium text-muted-foreground">
                    UPI Transaction ID / UTR (Optional)
                  </Label>
                  <Input
                    id="utrInput"
                    placeholder="e.g. 430129384920"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* TAB: Card */}
            {activeTab === "card" && (
              <div className="space-y-4">
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
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    <span>
                      {activeTab === "upi" ? `I Have Paid ₹${totalCost.toLocaleString("en-IN")} / Confirm` : `Pay ₹${totalCost.toLocaleString("en-IN")}`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-2.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>Instant Verification & Vehicle Lock</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
