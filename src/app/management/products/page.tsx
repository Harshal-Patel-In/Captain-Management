"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRealtime } from "@/context/realtime";
import { ManagementMetricCard, ManagementPageHero, ManagementSectionCard } from "@/components/management/page-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Boxes, PackagePlus, Store, Pencil, Moon, Sun, MoonStar, Zap } from "lucide-react";

interface PublishableProduct {
    id: number;
    name: string;
    category: string;
    qr_code_value: string;
    unit_type: string;
    unit_label: string;
    stock_quantity: number;
}

interface EcommerceProduct {
    id: string;
    sku: string;
    name: string;
    category: string;
    price: number;
    stock_quantity: number;
    is_active: boolean;
    description?: string;
    pack_size?: string;
    weight?: number;
    dimensions?: string;
    images?: string[];
    unit_of_measure?: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function ProductsPage() {
    const { on, off, isConnected } = useRealtime();
    const [publishableProducts, setPublishableProducts] = useState<PublishableProduct[]>([]);
    const [ecommerceProducts, setEcommerceProducts] = useState<EcommerceProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [recentUpdate, setRecentUpdate] = useState<string | null>(null);

    // Publish dialog state
    const [selectedProduct, setSelectedProduct] = useState<PublishableProduct | null>(null);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [packSize, setPackSize] = useState("");
    const [weight, setWeight] = useState("");
    const [imageUrl, setImageUrl] = useState("");

    // Edit dialog state
    const [editProduct, setEditProduct] = useState<EcommerceProduct | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editPrice, setEditPrice] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editPackSize, setEditPackSize] = useState("");
    const [editWeight, setEditWeight] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");

    // Sleep toggle loading
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Active tab state (controlled so it persists across data refreshes)
    const [activeTab, setActiveTab] = useState("publish");

    useEffect(() => {
        loadProducts(true);
    }, []);

    // Listen for real-time product updates
    useEffect(() => {
        const handleProductChanged = async () => {
            console.log('[REALTIME] Product changed detected, refreshing...');
            await loadProducts();
        };

        const handleEcommerceProductChanged = async (event: any) => {
            console.log('[REALTIME] E-commerce product changed:', event);
            setRecentUpdate(event.ecommerce_product_id);
            setTimeout(() => setRecentUpdate(null), 2000);
            await loadProducts();
        };

        const handleStockChanged = async () => {
            console.log('[REALTIME] Stock changed, refreshing product list...');
            await loadProducts();
        };

        on('product_changed', handleProductChanged);
        on('ecommerce_product_changed', handleEcommerceProductChanged);
        on('stock_changed', handleStockChanged);

        return () => {
            off('product_changed', handleProductChanged);
            off('ecommerce_product_changed', handleEcommerceProductChanged);
            off('stock_changed', handleStockChanged);
        };
    }, [on, off]);

    async function loadProducts(initial = false) {
        if (initial) setLoading(true);
        try {
            const [publishable, ecommerce] = await Promise.all([
                api.getPublishableProducts(),
                api.getEcommerceProducts(),
            ]);
            setPublishableProducts(publishable);
            setEcommerceProducts(ecommerce);
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            if (initial) setLoading(false);
        }
    }

    function openPublishDialog(product: PublishableProduct) {
        setSelectedProduct(product);
        setPrice("");
        setDescription("");
        setPackSize("");
        setWeight("");
        setImageUrl("");
        setPublishDialogOpen(true);
    }

    async function handlePublish() {
        if (!selectedProduct || !price || !imageUrl || !description) return;

        setPublishing(true);
        try {
            await api.publishProduct({
                source_product_id: selectedProduct.id,
                price: parseFloat(price),
                description: description || undefined,
                pack_size: packSize || undefined,
                weight: weight || undefined,
                images: imageUrl ? [imageUrl] : undefined,
                is_active: true,
            });

            // Close dialog and reset
            setPublishDialogOpen(false);
            setSelectedProduct(null);

            // Reload products
            await loadProducts();
        } catch (error: any) {
            alert(error.message || "Failed to publish product");
        } finally {
            setPublishing(false);
        }
    }

    async function openEditDialog(product: EcommerceProduct) {
        try {
            const detail = await api.getEcommerceProduct(product.id);
            setEditProduct(detail);
            setEditPrice(String(detail.price));
            setEditDescription(detail.description || "");
            setEditPackSize(detail.pack_size || "");
            setEditWeight(detail.weight ? String(detail.weight) : "");
            setEditImageUrl(detail.images?.[0] || "");
            setEditDialogOpen(true);
        } catch {
            // Fallback to list data if detail fetch fails
            setEditProduct(product);
            setEditPrice(String(product.price));
            setEditDescription(product.description || "");
            setEditPackSize(product.pack_size || "");
            setEditWeight(product.weight ? String(product.weight) : "");
            setEditImageUrl(product.images?.[0] || "");
            setEditDialogOpen(true);
        }
    }

    async function handleEditSave() {
        if (!editProduct || !editPrice) return;
        setEditLoading(true);
        try {
            await api.updateEcommerceProduct(editProduct.id, {
                price: parseFloat(editPrice),
                description: editDescription || undefined,
                pack_size: editPackSize || undefined,
                weight: editWeight ? parseFloat(editWeight) : undefined,
                images: editImageUrl ? [editImageUrl] : undefined,
            });
            setEditDialogOpen(false);
            setEditProduct(null);
            await loadProducts();
        } catch (error: any) {
            alert(error.message || "Failed to update product");
        } finally {
            setEditLoading(false);
        }
    }

    async function handleToggleSleep(product: EcommerceProduct) {
        setTogglingId(product.id);
        try {
            await api.updateEcommerceProduct(product.id, {
                is_active: !product.is_active,
            });
            await loadProducts();
        } catch (error: any) {
            alert(error.message || "Failed to update product status");
        } finally {
            setTogglingId(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ManagementPageHero
                eyebrow="Products"
                title="Catalog publishing workspace"
                description="Turn internal inventory items into polished e-commerce listings, preserve unit details, and keep a clear view of what is already live."
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ManagementMetricCard label="Publishable items" value={publishableProducts.length} meta="Ready to be listed" icon={PackagePlus} tint="amber" />
                    <ManagementMetricCard label="Published listings" value={ecommerceProducts.length} meta="Visible in commerce catalog" icon={Store} tint="blue" />
                    <ManagementMetricCard label="Active listings" value={ecommerceProducts.filter((product) => product.is_active).length} meta="Currently sellable" icon={Boxes} tint="emerald" />
                    <ManagementMetricCard label="Sleeping" value={ecommerceProducts.filter((p) => !p.is_active).length} meta="Hidden from e-commerce site" icon={MoonStar} tint="terracotta" />
                </div>
            </ManagementPageHero>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-auto rounded-2xl border border-[#0b1d15]/10 bg-white/60 p-1">
                    <TabsTrigger value="publish" className="rounded-xl px-4 py-2 text-sm font-medium text-[#0b1d15]/55 transition-all data-[state=active]:bg-[#0b1d15] data-[state=active]:text-[#f4f1ea] data-[state=active]:shadow-md">
                        Publish Product
                    </TabsTrigger>
                    <TabsTrigger value="published" className="rounded-xl px-4 py-2 text-sm font-medium text-[#0b1d15]/55 transition-all data-[state=active]:bg-[#0b1d15] data-[state=active]:text-[#f4f1ea] data-[state=active]:shadow-md">
                        Published ({ecommerceProducts.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="publish" className="mt-6">
                    <ManagementSectionCard
                        title="Select an inventory product"
                        description="Tap a product to compose its e-commerce listing."
                    >
                        {publishableProducts.length === 0 ? (
                            <div className="rounded-[1.4rem] border border-dashed border-[#0b1d15]/12 bg-[#f8f4ec] p-10 text-center text-[#0b1d15]/56">
                                All products have been published.
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {publishableProducts.map((product) => (
                                    <button
                                        key={product.id}
                                        onClick={() => openPublishDialog(product)}
                                        className="w-full rounded-[1.4rem] border border-[#0b1d15]/10 bg-[#fbf7ef] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#0b1d15]/18 hover:bg-white active:scale-[0.98]"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-base font-semibold text-[#0b1d15]">{product.name}</div>
                                                <div className="mt-1 truncate text-sm text-[#0b1d15]/55">
                                                    {product.category} • {product.unit_type} ({product.unit_label})
                                                </div>
                                            </div>
                                            <div className="shrink-0 rounded-2xl bg-[#0b1d15]/6 px-3 py-2 text-right">
                                                <div className="text-[10px] uppercase tracking-[0.16em] text-[#0b1d15]/50">Stock</div>
                                                <div className="text-lg font-semibold text-[#0b1d15]">{product.stock_quantity}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ManagementSectionCard>
                </TabsContent>

                <TabsContent value="published" className="mt-6">
                    <ManagementSectionCard title="Published e-commerce products" description="Your current commerce-ready catalog, aligned back to internal stock and unit metadata.">
                        {ecommerceProducts.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-[#0b1d15]/12 bg-[#f8f4ec] p-10 text-center text-[#0b1d15]/58">
                                No products published yet.
                            </div>
                        ) : (
                            <>
                                {/* Mobile: Card layout */}
                                <div className="space-y-3 md:hidden">
                                    {ecommerceProducts.map((product) => (
                                        <div key={product.id} className={`rounded-xl border border-[#0b1d15]/10 bg-[#fbf7ef] p-4 space-y-3 ${!product.is_active ? "opacity-60" : ""}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 font-medium text-[#0b1d15]">
                                                        {!product.is_active && <Moon className="h-3.5 w-3.5 text-amber-500" />}
                                                        {product.name}
                                                    </div>
                                                    <div className="text-sm text-[#0b1d15]/56">{product.category}</div>
                                                </div>
                                                <Badge variant="outline" className={product.is_active
                                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                                }>
                                                    {product.is_active ? "Active" : "Sleeping"}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                <span className="font-medium text-[#0b1d15]">{formatCurrency(product.price)}</span>
                                                <span className="text-emerald-600 font-medium">Stock: {product.stock_quantity}</span>
                                                <span className="font-mono text-[#0b1d15]/50">{product.sku}</span>
                                            </div>
                                            <div className="flex gap-2 pt-1 border-t border-[#0b1d15]/8">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(product)}
                                                    className="h-8 flex-1 gap-1.5 rounded-lg border-[#0b1d15]/12 text-[#0b1d15]/70 hover:bg-[#f4f1ea] hover:text-[#0b1d15]"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={togglingId === product.id}
                                                    onClick={() => handleToggleSleep(product)}
                                                    className={`h-8 flex-1 gap-1.5 rounded-lg ${product.is_active
                                                        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                    }`}
                                                >
                                                    {product.is_active ? (
                                                        <>
                                                            <Moon className="h-3.5 w-3.5" />
                                                            {togglingId === product.id ? "..." : "Sleep"}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sun className="h-3.5 w-3.5" />
                                                            {togglingId === product.id ? "..." : "Wake"}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop: Table layout */}
                            <div className="hidden md:block overflow-hidden rounded-[1.5rem] border border-[#0b1d15]/10 bg-white/80">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#f8f4ec] hover:bg-[#f8f4ec]">
                                            <TableHead>Name</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ecommerceProducts.map((product) => (
                                            <TableRow 
                                                key={product.id} 
                                                className={`hover:bg-[#fbf7ef] transition-colors duration-500 ${
                                                    recentUpdate === product.id ? 'bg-green-100' : ''
                                                } ${!product.is_active ? "opacity-60" : ""}`}
                                            >
                                                <TableCell className="font-medium text-[#0b1d15]">
                                                    <div className="flex items-center gap-2">
                                                        {recentUpdate === product.id && (
                                                            <Zap className="h-4 w-4 text-green-600" />
                                                        )}
                                                        {!product.is_active && <Moon className="h-3.5 w-3.5 text-amber-500" />}
                                                        {product.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm text-[#0b1d15]/56">{product.sku}</TableCell>
                                                <TableCell className="text-[#0b1d15]/56">{product.category}</TableCell>
                                                <TableCell className="text-right font-medium text-[#0b1d15]">{formatCurrency(product.price)}</TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">{product.stock_quantity}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={product.is_active
                                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                        : "bg-amber-100 text-amber-700 border-amber-200"
                                                    }>
                                                        {product.is_active ? "Active" : "Sleeping"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(product)}
                                                            className="h-8 gap-1.5 rounded-lg border-[#0b1d15]/12 text-[#0b1d15]/70 hover:bg-[#f4f1ea] hover:text-[#0b1d15]"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={togglingId === product.id}
                                                            onClick={() => handleToggleSleep(product)}
                                                            className={`h-8 gap-1.5 rounded-lg ${product.is_active
                                                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                                }`}
                                                        >
                                                            {product.is_active ? (
                                                                <>
                                                                    <Moon className="h-3.5 w-3.5" />
                                                                    {togglingId === product.id ? "..." : "Sleep"}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sun className="h-3.5 w-3.5" />
                                                                    {togglingId === product.id ? "..." : "Wake"}
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            </>
                        )}
                    </ManagementSectionCard>
                </TabsContent>
            </Tabs>

            {/* Edit Product Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="rounded-[1.8rem] border-[#0b1d15]/10 bg-[#f4f1ea] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-[#0b1d15]">Edit product details</DialogTitle>
                        <DialogDescription className="text-[#0b1d15]/55">
                            Update the listing info for <span className="font-medium text-[#0b1d15]">{editProduct?.name}</span>. Auto-synced fields (name, SKU, category, stock) cannot be changed here.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Price (₹) *</Label>
                                <Input
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    placeholder="Listing price"
                                    className="mt-2 rounded-xl bg-white/70"
                                />
                            </div>
                            <div>
                                <Label>Image URL</Label>
                                <Input
                                    type="url"
                                    value={editImageUrl}
                                    onChange={(e) => setEditImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="mt-2 rounded-xl bg-white/70"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Product description..."
                                className="mt-2 min-h-24 rounded-xl bg-white/70"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Pack Size</Label>
                                <Input
                                    value={editPackSize}
                                    onChange={(e) => setEditPackSize(e.target.value)}
                                    placeholder="e.g. 1L bottle"
                                    className="mt-2 rounded-xl bg-white/70"
                                />
                            </div>
                            <div>
                                <Label>Weight</Label>
                                <Input
                                    type="number"
                                    value={editWeight}
                                    onChange={(e) => setEditWeight(e.target.value)}
                                    placeholder="e.g. 1.2"
                                    className="mt-2 rounded-xl bg-white/70"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl border-[#0b1d15]/12">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSave}
                            disabled={!editPrice || editLoading}
                            className="rounded-xl bg-[#0b1d15] text-[#f4f1ea] hover:bg-[#163126]"
                        >
                            {editLoading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Publish Product Dialog */}
            <Dialog open={publishDialogOpen} onOpenChange={(open) => {
                setPublishDialogOpen(open);
                if (!open) setSelectedProduct(null);
            }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.8rem] border-[#0b1d15]/10 bg-[#f4f1ea] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-[#0b1d15]">Publish to e-commerce</DialogTitle>
                        <DialogDescription className="text-[#0b1d15]/55">
                            Add pricing, imagery, and description for <span className="font-medium text-[#0b1d15]">{selectedProduct?.name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-xl border border-[#0b1d15]/10 bg-[#f8f4ec] p-4">
                                <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#0b1d15]/50">Inventory details</div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#0b1d15]/40">SKU</div>
                                        <div className="mt-0.5 font-mono text-[#0b1d15]">{selectedProduct.qr_code_value}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#0b1d15]/40">Category</div>
                                        <div className="mt-0.5 text-[#0b1d15]">{selectedProduct.category}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#0b1d15]/40">Unit</div>
                                        <div className="mt-0.5 text-[#0b1d15]">{selectedProduct.unit_type} ({selectedProduct.unit_label})</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#0b1d15]/40">Stock</div>
                                        <div className="mt-0.5 font-medium text-emerald-600">{selectedProduct.stock_quantity}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>Price (₹) *</Label>
                                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter listing price" className="mt-2 rounded-xl bg-white/70" />
                                </div>
                                <div>
                                    <Label>Image URL *</Label>
                                    <Input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/product.jpg" className="mt-2 rounded-xl bg-white/70" />
                                </div>
                            </div>

                            <div>
                                <Label>Description *</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write a sharp, sale-ready description..." className="mt-2 min-h-24 rounded-xl bg-white/70" />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>Pack Size</Label>
                                    <Input value={packSize} onChange={(e) => setPackSize(e.target.value)} placeholder="e.g. 1L bottle" className="mt-2 rounded-xl bg-white/70" />
                                </div>
                                <div>
                                    <Label>Weight</Label>
                                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 1.2kg" className="mt-2 rounded-xl bg-white/70" />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setPublishDialogOpen(false)} className="rounded-xl border-[#0b1d15]/12">
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePublish}
                            disabled={!price || !imageUrl || !description || publishing}
                            className="rounded-xl bg-[#0b1d15] text-[#f4f1ea] hover:bg-[#163126]"
                        >
                            {publishing ? "Publishing..." : "Publish"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
