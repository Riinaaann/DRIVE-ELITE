import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { getGetVehicleQueryKey, useGetVehicle } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Fuel, 
  Settings, 
  Users, 
  Star, 
  CheckCircle2, 
  XCircle, 
  Gauge, 
  MessageSquare, 
  Send, 
  User as UserIcon, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

interface Review {
  id: number;
  vehicleId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function VehicleDetail() {
  const [, params] = useRoute("/vehicles/:id");
  const id = parseInt(params?.id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: vehicle, isLoading, error } = useGetVehicle(id, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) }
  });

  // Reviews state
  const [reviewsData, setReviewsData] = useState<{ reviews: Review[]; averageRating: number; totalReviews: number }>({
    reviews: [],
    averageRating: 5.0,
    totalReviews: 0
  });
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Review Form state
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(user?.name || "");
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchReviews = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/vehicles/${id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviewsData(data);
      }
    } catch (e) {
      console.error("Failed to fetch reviews", e);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (user?.name && !reviewerName) {
      setReviewerName(user.name);
    }
  }, [user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast({ title: "Comment required", description: "Please share a brief comment about this vehicle.", variant: "destructive" });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/vehicles/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: newRating,
          comment: reviewComment.trim(),
          userName: reviewerName.trim() || user?.name || "Verified Customer",
        }),
      });

      if (!res.ok) throw new Error("Failed to submit review");

      toast({ title: "Review Submitted!", description: "Thank you for your rating and feedback." });
      setReviewComment("");
      setIsReviewDialogOpen(false);
      
      // Refresh reviews & vehicle query
      fetchReviews();
      queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Could not submit review.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading vehicle details...</div>;
  }

  if (error || !vehicle) {
    return <div className="p-8 text-center text-destructive">Vehicle not found.</div>;
  }

  // Active rating is either from the live reviews calculation or vehicle record
  const currentRating = reviewsData.totalReviews > 0 ? reviewsData.averageRating : (vehicle.rating || 4.8);
  const mileageDisplay = (vehicle as any).mileage || "18 km/l";

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 max-w-6xl">
      <Link href="/fleet" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Fleet
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl overflow-hidden border border-border/40 bg-muted aspect-video flex items-center justify-center relative shadow-sm">
            {vehicle.imageUrl ? (
              <img 
                src={vehicle.imageUrl} 
                alt={`${vehicle.make} ${vehicle.model}`} 
                className="object-cover w-full h-full" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="font-bold text-4xl text-primary/40 uppercase tracking-widest">{vehicle.make}</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-white/90 text-black border-transparent shadow-sm px-3 py-1 text-sm font-medium">
                {vehicle.category}
              </Badge>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="text-4xl font-bold tracking-tight">{vehicle.make} {vehicle.model}</h1>
              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full w-fit">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span className="font-bold text-sm">{currentRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({reviewsData.totalReviews} reviews)</span>
              </div>
            </div>
            <p className="text-xl text-muted-foreground mt-2">{vehicle.year} • {vehicle.licensePlate}</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-4">Vehicle Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Fuel className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-medium">{vehicle.fuelType}</span>
                <span className="text-xs text-muted-foreground">Fuel Type</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Settings className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-medium">{vehicle.transmission}</span>
                <span className="text-xs text-muted-foreground">Transmission</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Users className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-medium">{vehicle.seats}</span>
                <span className="text-xs text-muted-foreground">Seats</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Gauge className="h-6 w-6 text-primary/70" />
                <span className="text-sm font-semibold text-primary">{mileageDisplay}</span>
                <span className="text-xs text-muted-foreground">Mileage</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40 flex flex-col items-center justify-center text-center gap-2">
                <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium">{currentRating.toFixed(1)} / 5</span>
                <span className="text-xs text-muted-foreground">Rating</span>
              </div>
            </div>
          </div>

          {vehicle.description && (
            <>
              <Separator />
              <div>
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p className="text-muted-foreground leading-relaxed">{vehicle.description}</p>
              </div>
            </>
          )}

          {/* Full Customer Reviews Section in Main Column */}
          <Separator />
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Customer Reviews</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real feedback from verified drivers
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsReviewDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-1.5" /> Write Review
              </Button>
            </div>

            {reviewsData.reviews.length === 0 ? (
              <div className="text-center py-10 bg-muted/20 border border-border/40 rounded-xl">
                <Star className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No reviews yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to review this {vehicle.make} {vehicle.model}!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewsData.reviews.slice(0, showAllReviews ? undefined : 3).map((r) => (
                  <div key={r.id} className="p-5 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {r.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-none">{r.userName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(parseISO(r.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <StarRatingDisplay rating={r.rating} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.comment}</p>
                  </div>
                ))}

                {reviewsData.reviews.length > 3 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs" 
                    onClick={() => setShowAllReviews(!showAllReviews)}
                  >
                    {showAllReviews ? (
                      <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</>
                    ) : (
                      <><ChevronDown className="h-4 w-4 mr-1" /> View All {reviewsData.reviews.length} Reviews</>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-baseline mb-2 text-primary">
                <span className="text-2xl font-semibold mr-1">₹</span>
                <span className="text-5xl font-bold tracking-tight">{Number(vehicle.dailyRate).toLocaleString("en-IN")}</span>
                <span className="text-muted-foreground ml-2">/ day</span>
              </div>
              
              <div className="flex items-center gap-2 mt-4 mb-6">
                {vehicle.isAvailable ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Available for rental</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Currently unavailable</span>
                  </>
                )}
              </div>

              <Separator className="my-6" />

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span className="font-medium">₹10,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Insurance</span>
                  <span className="font-medium text-green-600 dark:text-green-400">Included</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mileage</span>
                  <span className="font-semibold text-primary">{mileageDisplay}</span>
                </div>
              </div>

              {/* REVIEWS & STAR RATING SECTION RIGHT BEFORE THE BUTTON */}
              <div className="mb-6 rounded-xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Customer Rating</span>
                  <button 
                    onClick={() => setIsReviewDialogOpen(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    + Add Review
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <StarRatingDisplay rating={currentRating} size="md" />
                  </div>
                  <span className="font-bold text-lg text-foreground">{currentRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({reviewsData.totalReviews} {reviewsData.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                </div>

                {reviewsData.reviews.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                    <span className="italic">"{reviewsData.reviews[0].comment.slice(0, 65)}..."</span>
                    <span className="block mt-1 font-medium text-foreground text-[11px]">— {reviewsData.reviews[0].userName}</span>
                  </div>
                )}
              </div>

              {/* RENT THIS VEHICLE BUTTON */}
              <Link href={`/vehicles/${vehicle.id}/book`} className="w-full block">
                <Button 
                  className="w-full font-bold text-base h-12" 
                  size="lg" 
                  disabled={!vehicle.isAvailable}
                >
                  {vehicle.isAvailable ? "Rent This Vehicle" : "Not Available"}
                </Button>
              </Link>
            </div>
            <div className="bg-muted/50 p-4 text-center text-xs text-muted-foreground border-t border-border/40">
              Free cancellation up to 48 hours before pickup.
            </div>
          </div>
        </div>
      </div>

      {/* Review Submission Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your rental experience for the {vehicle.make} {vehicle.model}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Your Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoverRating || newRating)
                          ? "fill-amber-500 text-amber-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-bold text-sm text-foreground">
                  {newRating} / 5 Stars
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewerName">Your Name</Label>
              <Input
                id="reviewerName"
                placeholder="e.g. John D."
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewComment">Your Feedback</Label>
              <Textarea
                id="reviewComment"
                rows={4}
                placeholder="How was the drive, comfort, cleanliness, and fuel efficiency?"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsReviewDialogOpen(false)} disabled={isSubmittingReview}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingReview}>
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StarRatingDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4";
  const rounded = Math.round(rating);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= rounded
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </div>
  );
}
