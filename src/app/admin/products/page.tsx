"use client";

import { useEffect, useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";

const UNIT_TYPE_TO_LABEL = {
    piece: "pcs",
    volume: "L",
    mass: "Kg",
} as const;

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
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
    const [error, setError] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [deleteError, setDeleteError] = useState("");

    useEffect(() => {
        loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data.products || []);
        } catch (err: any) {
            console.error("Failed to load products:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

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
            loadProducts();
        } catch (err: any) {
            setError(err.message || "Failed to create product");
        }
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setDeleteError("");
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;

        // Optimistic UI update: immediately remove from UI
        const originalProducts = [...products];
        setProducts(products.filter(p => p.id !== productToDelete.id));
        setDeleteDialogOpen(false);

        try {
            await api.deleteProduct(productToDelete.id);
            setProductToDelete(null);
            // Success! The UI is already updated
        } catch (err: any) {
            // Revert the optimistic update on error
            setProducts(originalProducts);
            setDeleteError(err.message || "Failed to delete product");
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
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>All Products ({products.length})</CardTitle>
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
                                                <div key={product.id} className="rounded-xl border bg-card p-4 space-y-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="font-medium text-[#0b1d15]">{product.name}</div>
                                                            <div className="text-sm text-gray-500">{product.category || "Uncategorized"}</div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(product)}
                                                            className="text-red-600 hover:text-red-700 -mr-2 -mt-1"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                                        <span className="capitalize">{product.unit_label} ({product.unit_type})</span>
                                                        <span className="font-mono">{product.qr_code_value}</span>
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
                                                    <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(product)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
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
                                        Are you sure you want to delete "{productToDelete?.name}"?
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
