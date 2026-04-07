"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { Product } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const UNIT_TYPE_TO_LABEL = {
    piece: "pcs",
    volume: "L",
    mass: "Kg",
} as const;

const getErrorMessage = (err: unknown, fallbackMessage: string) => {
    if (err instanceof Error) return err.message;
    return fallbackMessage;
};

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFilterLoading, setIsFilterLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [categories, setCategories] = useState<string[]>([]);
    const [quantityByProductId, setQuantityByProductId] = useState<Record<number, number>>({});
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        category: string;
        qr_code_value: string;
        unit_type: "piece" | "volume" | "mass";
        unit_label: "pcs" | "L" | "ml" | "Kg";
    }>({
        name: "",
        category: "",
        qr_code_value: "",
        unit_type: "piece",
        unit_label: "pcs"
    });
    const [editFormData, setEditFormData] = useState<{
        name: string;
        category: string;
        unit_type: "piece" | "volume" | "mass";
        unit_label: "pcs" | "L" | "ml" | "Kg";
    }>({
        name: "",
        category: "",
        unit_type: "piece",
        unit_label: "pcs",
    });
    const [error, setError] = useState("");
    const [editError, setEditError] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const hasLoadedRef = useRef(false);

    const loadProducts = useCallback(async (searchTerm?: string, categoryFilter?: string) => {
        const isInitialRequest = !hasLoadedRef.current;
        if (isInitialRequest) {
            setLoading(true);
        } else {
            setIsFilterLoading(true);
        }

        try {
            const [productsData, inventoryData] = await Promise.all([
                api.getProducts(searchTerm, categoryFilter),
                api.getInventory(searchTerm, categoryFilter),
            ]);
            const fetchedProducts = productsData.products || [];
            setProducts(fetchedProducts);

            const quantityMap: Record<number, number> = {};
            for (const item of inventoryData.items || []) {
                quantityMap[item.product_id] = item.quantity;
            }
            setQuantityByProductId(quantityMap);

            if (!searchTerm && !categoryFilter) {
                const uniqueCategories = Array.from(
                    new Set(
                        fetchedProducts
                            .map((product) => product.category?.trim())
                            .filter((value): value is string => Boolean(value)),
                    ),
                ).sort((a, b) => a.localeCompare(b));
                setCategories(uniqueCategories);
            }
        } catch (err: unknown) {
            console.error("Failed to load products:", err);
        } finally {
            if (isInitialRequest) {
                setLoading(false);
                hasLoadedRef.current = true;
            }
            setIsFilterLoading(false);
        }
    }, []);

    useEffect(() => {
        const activeCategory = category === "all" ? undefined : category;
        const debounceTimer = window.setTimeout(() => {
            void loadProducts(search.trim() || undefined, activeCategory);
        }, 250);

        return () => window.clearTimeout(debounceTimer);
    }, [search, category, loadProducts]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setStatusMessage(null);

        try {
            await api.createProduct(formData);
            setDialogOpen(false);
            setFormData({
                name: "",
                category: "",
                qr_code_value: "",
                unit_type: "piece",
                unit_label: "pcs"
            });
            const activeCategory = category === "all" ? undefined : category;
            await loadProducts(search.trim() || undefined, activeCategory);
            setStatusMessage({ type: "success", text: "Product created successfully." });
        } catch (err: unknown) {
            setError(getErrorMessage(err, "Failed to create product"));
        }
    };

    const handleEditClick = (product: Product) => {
        setProductToEdit(product);
        setEditError("");
        setEditFormData({
            name: product.name,
            category: product.category || "",
            unit_type: product.unit_type,
            unit_label: product.unit_label,
        });
        setEditDialogOpen(true);
    };

    const handleUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productToEdit) return;

        setEditError("");
        setEditLoading(true);
        setStatusMessage(null);

        try {
            const trimmedName = editFormData.name.trim();
            const trimmedCategory = editFormData.category.trim();
            const currentCategory = productToEdit.category || "";

            if (!trimmedName) {
                setEditError("Product name cannot be empty");
                return;
            }

            const noChanges =
                trimmedName === productToEdit.name &&
                trimmedCategory === currentCategory &&
                editFormData.unit_type === productToEdit.unit_type;

            if (noChanges) {
                setEditDialogOpen(false);
                setProductToEdit(null);
                setStatusMessage({ type: "success", text: "No changes to save." });
                return;
            }

            await api.updateProduct(productToEdit.id, {
                name: trimmedName,
                category: trimmedCategory ? trimmedCategory : null,
                unit_type: editFormData.unit_type,
            });

            setEditDialogOpen(false);
            setProductToEdit(null);
            const activeCategory = category === "all" ? undefined : category;
            await loadProducts(search.trim() || undefined, activeCategory);
            setStatusMessage({ type: "success", text: "Product updated successfully." });
        } catch (err: unknown) {
            setEditError(getErrorMessage(err, "Failed to update product"));
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setDeleteError("");
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        setStatusMessage(null);

        // Optimistic UI update: immediately remove from UI
        const originalProducts = [...products];
        setProducts(products.filter(p => p.id !== productToDelete.id));
        setDeleteDialogOpen(false);

        try {
            await api.deleteProduct(productToDelete.id);
            setProductToDelete(null);
            setStatusMessage({ type: "success", text: "Product deleted successfully." });
            // Success! The UI is already updated
        } catch (err: unknown) {
            // Revert the optimistic update on error
            setProducts(originalProducts);
            setDeleteError(getErrorMessage(err, "Failed to delete product"));
            setDeleteDialogOpen(true); // Re-open dialog to show error
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        setDeleteError("");
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-[#0b1d15] mb-2 sm:text-3xl">Products</h2>
                                <p className="text-gray-600">Manage your product registry</p>
                                {statusMessage && (
                                    <p
                                        className={`mt-2 rounded-md border px-3 py-2 text-sm ${
                                            statusMessage.type === "success"
                                                ? "border-green-200 bg-green-50 text-green-700"
                                                : "border-red-200 bg-red-50 text-red-700"
                                        }`}
                                    >
                                        {statusMessage.text}
                                    </p>
                                )}
                            </div>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add Product
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create New Product</DialogTitle>
                                        <DialogDescription>Add a new product to the inventory system</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreate} className="space-y-4">
                                        <div>
                                            <Label htmlFor="name">Product Name *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="category">Category</Label>
                                            <Input
                                                id="category"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="qr">QR Code Value *</Label>
                                            <Input
                                                id="qr"
                                                value={formData.qr_code_value}
                                                onChange={(e) => setFormData({ ...formData, qr_code_value: e.target.value })}
                                                placeholder="Unique identifier"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="unit_type">Unit Type</Label>
                                            <Select
                                                value={formData.unit_type}
                                                onValueChange={(value: "piece" | "volume" | "mass") => {
                                                    setFormData({
                                                        ...formData,
                                                        unit_type: value,
                                                        unit_label: UNIT_TYPE_TO_LABEL[value],
                                                    });
                                                }}
                                            >
                                                <SelectTrigger id="unit_type">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="piece">Piece</SelectItem>
                                                    <SelectItem value="volume">Volume</SelectItem>
                                                    <SelectItem value="mass">Mass</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="unit_label">Unit Label</Label>
                                            <Select value={formData.unit_label} disabled>
                                                <SelectTrigger id="unit_label">
                                                    <SelectValue placeholder="Select unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formData.unit_type === "piece" ? (
                                                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                                                    ) : formData.unit_type === "mass" ? (
                                                        <SelectItem value="Kg">Kilograms (Kg)</SelectItem>
                                                    ) : (
                                                        <SelectItem value="L">Liters (L)</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {error && <p className="text-sm text-red-600">{error}</p>}
                                        <Button type="submit" className="w-full">Create Product</Button>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog
                                open={editDialogOpen}
                                onOpenChange={(open) => {
                                    setEditDialogOpen(open);
                                    if (!open) {
                                        setProductToEdit(null);
                                        setEditError("");
                                    }
                                }}
                            >
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Product</DialogTitle>
                                        <DialogDescription>Update product details. QR code cannot be changed.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleUpdateProduct} className="space-y-4">
                                        <div>
                                            <Label htmlFor="edit-name">Product Name *</Label>
                                            <Input
                                                id="edit-name"
                                                value={editFormData.name}
                                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-category">Category</Label>
                                            <Input
                                                id="edit-category"
                                                value={editFormData.category}
                                                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-qr">QR Code</Label>
                                            <Input
                                                id="edit-qr"
                                                value={productToEdit?.qr_code_value || ""}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-unit-type">Unit Type</Label>
                                            <Select
                                                value={editFormData.unit_type}
                                                onValueChange={(value: "piece" | "volume" | "mass") => {
                                                    setEditFormData({
                                                        ...editFormData,
                                                        unit_type: value,
                                                        unit_label: UNIT_TYPE_TO_LABEL[value],
                                                    });
                                                }}
                                            >
                                                <SelectTrigger id="edit-unit-type">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="piece">Piece</SelectItem>
                                                    <SelectItem value="volume">Volume</SelectItem>
                                                    <SelectItem value="mass">Mass</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-unit-label">Unit Label</Label>
                                            <Select value={editFormData.unit_label} disabled>
                                                <SelectTrigger id="edit-unit-label">
                                                    <SelectValue placeholder="Select unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {editFormData.unit_type === "piece" ? (
                                                        <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                                                    ) : editFormData.unit_type === "mass" ? (
                                                        <SelectItem value="Kg">Kilograms (Kg)</SelectItem>
                                                    ) : (
                                                        <SelectItem value="L">Liters (L)</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {editError && <p className="text-sm text-red-600">{editError}</p>}
                                        <Button type="submit" className="w-full" disabled={editLoading}>
                                            {editLoading ? "Saving..." : "Save Changes"}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>All Products ({products.length})</CardTitle>
                                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                                    <Input
                                        placeholder="Search by product, QR, or quantity..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full"
                                    />
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="border-[#0b1d15]/25 bg-[#e7f2ec] text-[#0b1d15]">
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent className="border-[#0b1d15]/20 bg-[#f8fbf9]">
                                            <SelectItem value="all" className="text-[#0b1d15]">All categories</SelectItem>
                                            {categories.map((itemCategory) => (
                                                <SelectItem key={itemCategory} value={itemCategory} className="text-[#0b1d15]">
                                                    {itemCategory}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="mt-2 min-h-5 text-xs text-gray-500">
                                    {isFilterLoading && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Updating results...
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : products.length === 0 ? (
                                    <p className="text-gray-600 text-center py-8">No products yet. Create one to get started.</p>
                                ) : (
                                    <>
                                        {/* Mobile: Card layout */}
                                        <div className="space-y-3 md:hidden">
                                            {products.map((product) => (
                                                <div key={product.id} className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-4 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)] space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="font-medium text-[#0b1d15]">{product.name}</div>
                                                            <div className="text-sm text-gray-500">{product.category || "Uncategorized"}</div>
                                                        </div>
                                                        <div className="flex items-center gap-1 -mr-2 -mt-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditClick(product)}
                                                                className="text-[#0b1d15] hover:text-[#0b1d15]"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(product)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                                        <span className="capitalize">{product.unit_label} ({product.unit_type})</span>
                                                        <span className="font-mono">{product.qr_code_value}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Quantity: {quantityByProductId[product.id] !== undefined ? `${formatQuantity(quantityByProductId[product.id])} ${product.unit_label}` : `0 ${product.unit_label}`}
                                                    </div>
                                                    <div className="text-xs text-gray-400">Created {new Date(product.created_at).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Desktop: Table layout */}
                                        <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>QR Code</TableHead>
                                                <TableHead className="text-right">Quantity</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.map((product) => (
                                                <TableRow key={product.id}>
                                                    <TableCell>{product.id}</TableCell>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell>{product.category || "-"}</TableCell>
                                                    <TableCell className="capitalize">{product.unit_label} ({product.unit_type})</TableCell>
                                                    <TableCell className="font-mono text-sm">{product.qr_code_value}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {quantityByProductId[product.id] !== undefined ? `${formatQuantity(quantityByProductId[product.id])} ${product.unit_label}` : `0 ${product.unit_label}`}
                                                    </TableCell>
                                                    <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditClick(product)}
                                                                className="text-[#0b1d15] hover:text-[#0b1d15]"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(product)}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                            </CardContent>
                        </Card>

                        {/* Delete Confirmation Dialog */}
                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Delete Product</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to delete {" "}
                                        <span className="font-semibold">&quot;{productToDelete?.name}&quot;</span>?
                                        This will fail if stock logs exist for this product.
                                    </DialogDescription>
                                </DialogHeader>
                                {deleteError && (
                                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                        <p className="text-sm text-red-600">{deleteError}</p>
                                    </div>
                                )}
                                <div className="flex gap-3 justify-end mt-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleDeleteCancel}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteConfirm}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
