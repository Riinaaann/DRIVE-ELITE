import { useEffect, useState, useRef } from "react";
import { 
  useListVehicles, 
  useCreateVehicle, 
  useUpdateVehicle, 
  useDeleteVehicle,
  useRequestUploadUrl,
  VehicleCategory,
  VehicleTransmission
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Upload, X, Loader2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

export default function AdminVehicles() {
  const [search, setSearch] = useState("");
  const { data: vehicles, isLoading } = useListVehicles(search ? { search } : {});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
          toast({ title: "Vehicle deleted successfully" });
        }
      });
    }
  };

  const handleToggleAvailability = (id: number, currentAvailable: boolean) => {
    updateMutation.mutate({ id, data: { isAvailable: !currentAvailable } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        toast({ title: "Availability updated" });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Management</h1>
          <p className="text-muted-foreground mt-1">Manage your fleet inventory</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by make, model..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Vehicle</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Enter the vehicle details, specifications, mileage, and upload photos to add it to your fleet.
                </DialogDescription>
              </DialogHeader>
              <VehicleForm 
                onCancel={() => setIsAddOpen(false)}
                onSubmit={(data: any) => {
                  createMutation.mutate({ data }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
                      toast({ title: "Vehicle added successfully" });
                      setIsAddOpen(false);
                    },
                    onError: (error: any) => {
                      toast({
                        title: "Unable to add vehicle",
                        description: error?.data?.error || error?.message || "Please check the vehicle details and try again.",
                        variant: "destructive",
                      });
                    },
                  });
                }} 
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-muted-foreground bg-muted/20">
                  <th className="py-3 px-4 font-medium">Vehicle</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">License Plate</th>
                  <th className="py-3 px-4 font-medium">Mileage</th>
                  <th className="py-3 px-4 font-medium">Daily Rate</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center">Loading...</td></tr>
                ) : !vehicles?.length ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No vehicles found.</td></tr>
                ) : vehicles.map(v => (
                  <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 bg-muted rounded overflow-hidden flex items-center justify-center shrink-0">
                          {v.imageUrl ? <img src={v.imageUrl} className="object-cover w-full h-full" alt="" /> : <Car className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-semibold">{v.make} {v.model}</p>
                          <p className="text-xs text-muted-foreground">{v.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><Badge variant="outline">{v.category}</Badge></td>
                    <td className="py-3 px-4 font-mono">{v.licensePlate}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{(v as any).mileage || "15 km/l"}</td>
                    <td className="py-3 px-4 font-medium">₹{Number(v.dailyRate).toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={v.isAvailable} 
                          onCheckedChange={() => handleToggleAvailability(v.id, v.isAvailable)} 
                        />
                        <span className="text-xs font-medium">{v.isAvailable ? "Available" : "Unavailable"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingVehicle(v)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingVehicle} onOpenChange={(o) => !o && setEditingVehicle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update specifications, mandatory mileage, availability, pricing, or vehicle imagery.
            </DialogDescription>
          </DialogHeader>
          {editingVehicle && (
            <VehicleForm 
              defaultValues={editingVehicle}
              onCancel={() => setEditingVehicle(null)}
              onSubmit={(data: any) => {
                updateMutation.mutate({ id: editingVehicle.id, data }, {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
                    toast({ title: "Vehicle updated successfully" });
                    setEditingVehicle(null);
                  },
                  onError: (error: any) => {
                    toast({
                      title: "Unable to update vehicle",
                      description: error?.data?.error || error?.message || "Please check the vehicle details and try again.",
                      variant: "destructive",
                    });
                  },
                });
              }} 
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehicleForm({ onSubmit, onCancel, defaultValues = {}, isPending }: any) {
  const { toast } = useToast();
  const requestUploadUrl = useRequestUploadUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    make: defaultValues.make || "",
    model: defaultValues.model || "",
    year: defaultValues.year ? String(defaultValues.year) : String(new Date().getFullYear()),
    category: defaultValues.category || "Normal",
    dailyRate: defaultValues.dailyRate !== undefined && defaultValues.dailyRate !== null ? String(defaultValues.dailyRate) : "2000",
    seats: defaultValues.seats !== undefined && defaultValues.seats !== null ? String(defaultValues.seats) : "5",
    transmission: defaultValues.transmission || "Automatic",
    fuelType: defaultValues.fuelType || "Petrol",
    licensePlate: defaultValues.licensePlate || "",
    mileage: defaultValues.mileage !== undefined && defaultValues.mileage !== null ? String(defaultValues.mileage) : "",
    imageUrl: defaultValues.imageUrl || "",
    description: defaultValues.description || "",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultValues.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, imageUrl: val }));
    if (!previewUrl?.startsWith("blob:")) {
      setPreviewUrl(val.trim() || null);
    }
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file (PNG, JPG, WEBP, etc.).", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image is too large", description: "Please choose an image smaller than 10 MB.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const upload = await requestUploadUrl.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type,
        },
      });

      const uploadResponse = await fetch(upload.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("The image upload failed.");
      }

      setFormData(prev => ({
        ...prev,
        imageUrl: `/api/storage${upload.objectPath}`,
      }));
      toast({ title: "Image uploaded", description: "The image will be saved with this vehicle." });
    } catch (error: any) {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(formData.imageUrl || null);
      toast({
        title: "Image upload failed",
        description: error?.data?.error || error?.message || "Could not upload image from device.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setFormData(prev => ({ ...prev, imageUrl: "" }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    // Mileage is mandatory
    if (!formData.mileage.trim()) {
      toast({
        title: "Mileage is mandatory",
        description: "Please enter the vehicle mileage before saving.",
        variant: "destructive",
      });
      return;
    }

    const parsedData = {
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: parseInt(formData.year) || new Date().getFullYear(),
      category: formData.category,
      dailyRate: parseFloat(formData.dailyRate) || 0,
      seats: parseInt(formData.seats) || 5,
      transmission: formData.transmission,
      fuelType: formData.fuelType.trim() || "Petrol",
      licensePlate: formData.licensePlate.trim().toUpperCase(),
      mileage: formData.mileage.trim(),
      imageUrl: formData.imageUrl.trim() || undefined,
      description: formData.description.trim() || undefined,
    };

    onSubmit(parsedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <Input 
            id="make" 
            required 
            placeholder="e.g. BMW, Mercedes, Toyota" 
            value={formData.make} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input 
            id="model" 
            required 
            placeholder="e.g. M5, C-Class, Camry" 
            value={formData.model} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input 
            id="year" 
            type="number" 
            min="1900" 
            max={new Date().getFullYear() + 2} 
            required 
            value={formData.year} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="licensePlate">License Plate</Label>
          <Input 
            id="licensePlate" 
            required 
            placeholder="e.g. KA01AB1234" 
            className="uppercase font-mono"
            value={formData.licensePlate} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(v) => handleSelectChange('category', v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {Object.values(VehicleCategory).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="transmission">Transmission</Label>
          <Select value={formData.transmission} onValueChange={(v) => handleSelectChange('transmission', v)}>
            <SelectTrigger><SelectValue placeholder="Select transmission" /></SelectTrigger>
            <SelectContent>
              {Object.values(VehicleTransmission).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dailyRate">Daily Rate (₹)</Label>
          <Input 
            id="dailyRate" 
            type="number" 
            step="any" 
            min="0" 
            required 
            placeholder="e.g. 2500" 
            value={formData.dailyRate} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuelType">Fuel Type</Label>
          <Input 
            id="fuelType" 
            required 
            placeholder="e.g. Petrol, Diesel, Electric" 
            value={formData.fuelType} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seats">Seats</Label>
          <Input 
            id="seats" 
            type="number" 
            min="1" 
            max="30" 
            required 
            value={formData.seats} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mileage" className="flex items-center gap-1 font-semibold">
            Mileage <span className="text-destructive">*</span>
          </Label>
          <Input 
            id="mileage" 
            required 
            placeholder="e.g. 15 km/l or 450 km / charge" 
            value={formData.mileage} 
            onChange={handleChange} 
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="imageUrl">Image Web URL (Optional)</Label>
          <Input 
            id="imageUrl" 
            placeholder="https://images.unsplash.com/..." 
            value={formData.imageUrl} 
            onChange={handleImageUrlChange} 
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
        <Label htmlFor="imageFile" className="font-semibold text-sm">Upload Photo from Device</Label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Input
            id="imageFile"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={isUploading}
            className="cursor-pointer bg-background"
          />
          {previewUrl && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={removeImage}
              className="text-destructive hover:bg-destructive/10 shrink-0"
            >
              <X className="h-4 w-4 mr-1" /> Remove Image
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, WEBP, GIF (up to 10 MB).</p>

        {previewUrl && (
          <div className="relative mt-3 h-40 w-full overflow-hidden rounded-md border bg-muted/60">
            <img 
              src={previewUrl} 
              alt="Vehicle preview" 
              className="h-full w-full object-cover" 
              onError={() => {
                toast({ title: "Image preview error", description: "Could not load image from the provided URL.", variant: "destructive" });
              }}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm font-medium backdrop-blur-sm">
                <Upload className="mr-2 h-4 w-4 animate-bounce text-primary" />
                Uploading image...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input 
          id="description" 
          placeholder="Brief description or highlight features..." 
          value={formData.description} 
          onChange={handleChange} 
        />
      </div>

      <DialogFooter className="pt-2 gap-2 sm:gap-0">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending || isUploading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading Image...
            </>
          ) : isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Vehicle...
            </>
          ) : (
            "Save Vehicle"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Stub for the missing import
function Car(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>; }
