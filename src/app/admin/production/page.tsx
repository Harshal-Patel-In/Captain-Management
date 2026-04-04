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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { Product, RecipeItem } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { Plus, Trash2, ArrowRight, Package, AlertTriangle } from "lucide-react";

export default function ProductionPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [produceQty, setProduceQty] = useState<number | string>(1);

    // Recipe State
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    // If true, we are defining a new recipe on the fly
    const [isCustomRecipe, setIsCustomRecipe] = useState(false);

    // Ingredient Selection State
    const [availableIngredients, setAvailableIngredients] = useState<Product[]>([]);
    const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
    const [ingredientQty, setIngredientQty] = useState<number | string>(0);

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const loadData = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data.products || []);
            setAvailableIngredients(data.products || []); // All products can be ingredients
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const handleProductSelect = async (productId: string) => {
        const product = products.find(p => p.id.toString() === productId);
        if (!product) return;

        setSelectedProduct(product);
        setRecipeItems([]);
        setIsCustomRecipe(false);
        setStatus("idle");
        setProduceQty(1);

        // Try to fetch existing recipe
        try {
            const recipe = await api.getRecipe(product.id);
            if (recipe && recipe.items.length > 0) {
                // Map ingredients details
                const itemsWithDetails = recipe.items.map(item => ({
                    ...item,
                    ingredient: products.find(p => p.id === item.ingredient_id)
                }));
                setRecipeItems(itemsWithDetails);
            } else {
                // No recipe found, prompt to create
                setIsCustomRecipe(true);
            }
        } catch (err) {
            console.warn("No recipe found or fetch error", err);
            setIsCustomRecipe(true);
        }
    };

    const addIngredient = () => {
        if (!selectedIngredientId || Number(ingredientQty) <= 0) return;

        const ingredient = products.find(p => p.id.toString() === selectedIngredientId);
        if (!ingredient) return;

        if (ingredient.unit_type === "piece" && !Number.isInteger(Number(ingredientQty))) {
            const popupMessage = `You entered floating number for piece unit type product ${ingredient.name}.`;
            window.alert(popupMessage);
            return;
        }

        // Check if already exists
        if (recipeItems.some(i => i.ingredient_id === ingredient.id)) {
            alert("Ingredient already added");
            return;
        }

        const newItem: RecipeItem = {
            ingredient_id: ingredient.id,
            quantity: Number(ingredientQty),
            ingredient: ingredient
        };

        setRecipeItems([...recipeItems, newItem]);
        setSelectedIngredientId("");
        setIngredientQty(0);
    };

    const removeIngredient = (index: number) => {
        const newItems = [...recipeItems];
        newItems.splice(index, 1);
        setRecipeItems(newItems);
    };

    const handleProduce = async () => {
        if (!selectedProduct) return;
        if (recipeItems.length === 0) {
            setErrorMessage("Please define at least one ingredient.");
            setStatus("error");
            return;
        }

        if (selectedProduct.unit_type === "piece" && !Number.isInteger(Number(produceQty))) {
            const popupMessage = `You entered floating number for piece unit type product ${selectedProduct.name}.`;
            setErrorMessage(popupMessage);
            setStatus("error");
            window.alert(popupMessage);
            return;
        }

        setStatus("loading");
        setErrorMessage("");

        try {
            const payload = {
                product_id: selectedProduct.id,
                quantity: Number(produceQty),
                // Only send custom_recipe if we entered mode, OR always send current items to update?
                // Plan said: if provided, it updates. Let's always send to be safe/sync.
                custom_recipe: recipeItems.map(i => ({
                    ingredient_id: i.ingredient_id,
                    quantity: i.quantity
                }))
            };

            await api.executeProduction(payload);
            setStatus("success");
            // Reset after success
            setTimeout(() => {
                setStatus("idle");
                setSelectedProduct(null);
                setRecipeItems([]);
            }, 2000);

        } catch (err: unknown) {
            setStatus("error");
            setErrorMessage(err instanceof Error ? err.message : "Production failed");
        }
    };

    const selectedIngredient = products.find((p) => p.id.toString() === selectedIngredientId);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-2xl font-semibold text-[#0b1d15] mb-2 sm:text-3xl">Manufacturing</h2>
                            <p className="text-gray-600">Produce finished goods from ingredients</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                            {/* Left: Product & Recipe Setup */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>1. Select Product</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <Label>Product to Produce</Label>
                                        <Select onValueChange={handleProductSelect}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a product..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.name} ({p.unit_label})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedProduct && (
                                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-in fade-in">
                                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                Recipe for {selectedProduct.name}
                                                {isCustomRecipe && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">New Recipe</span>}
                                            </h3>

                                            {/* Recipe Builder */}
                                            <div className="space-y-4 mb-6">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                                    <div className="flex-1">
                                                        <Label className="text-xs">Ingredient</Label>
                                                        <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Add ingredient" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableIngredients
                                                                    .filter(p =>
                                                                        p.id !== selectedProduct.id && // Prevent self-reference
                                                                        !recipeItems.some(item => item.ingredient_id === p.id) // Prevent duplicates
                                                                    )
                                                                    .map(p => (
                                                                        <SelectItem key={p.id} value={p.id.toString()}>
                                                                            {p.name} ({p.unit_label})
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="w-full sm:w-24">
                                                        <Label className="text-xs">Qty (per 1 {selectedProduct.unit_label})</Label>
                                                        <Input
                                                            type="number"
                                                            min={selectedIngredient?.unit_type === "piece" ? "1" : "0.001"}
                                                            step={selectedIngredient?.unit_type === "piece" ? "1" : "0.001"}
                                                            className="h-9"
                                                            value={ingredientQty}
                                                            onChange={e => setIngredientQty(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                                        />
                                                    </div>
                                                    <Button size="sm" onClick={addIngredient} disabled={!selectedIngredientId || Number(ingredientQty) <= 0}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                {/* Recipe List */}
                                                <div className="border rounded-md overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-gray-50">
                                                                <TableHead className="h-8">Ingredient</TableHead>
                                                                <TableHead className="h-8 text-right">Required per 1 Unit</TableHead>
                                                                <TableHead className="h-8 w-10"></TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {recipeItems.length === 0 ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={3} className="text-center text-gray-400 py-4">No ingredients defined</TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                recipeItems.map((item, idx) => (
                                                                    <TableRow key={idx}>
                                                                        <TableCell>{item.ingredient?.name || item.ingredient_id}</TableCell>
                                                                        <TableCell className="text-right font-mono">
                                                                            {formatQuantity(item.quantity)} {item.ingredient?.unit_label}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeIngredient(idx)}>
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Right: Production Execution */}
                            {selectedProduct && (
                                <Card className="animate-in slide-in-from-right-4">
                                    <CardHeader>
                                        <CardTitle>2. Execute Order</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div>
                                            <Label className="text-lg">Quantity to Produce ({selectedProduct.unit_label})</Label>
                                            <div className="flex items-center gap-4 mt-2">
                                                <Input
                                                    type="number"
                                                    min={selectedProduct.unit_type === "piece" ? "1" : "0.001"}
                                                    step={selectedProduct.unit_type === "piece" ? "1" : "0.001"}
                                                    value={produceQty}
                                                    onChange={e => setProduceQty(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                                    className="text-2xl h-14 font-semibold"
                                                />
                                            </div>
                                            {selectedProduct.unit_type === "piece" && (
                                                <p className="mt-1 text-xs text-gray-500">Whole numbers only for piece-based products.</p>
                                            )}
                                        </div>

                                        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                                            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                                                <ArrowRight className="h-4 w-4" />
                                                Stock Impact
                                            </h4>
                                            <ul className="space-y-1 text-sm text-yellow-900">
                                                {recipeItems.map((item, idx) => (
                                                    <li key={idx} className="flex justify-between">
                                                        <span>{item.ingredient?.name}</span>
                                                        <span className="font-mono font-bold text-red-600">
                                                            -{formatQuantity(item.quantity * Number(produceQty))} {item.ingredient?.unit_label}
                                                        </span>
                                                    </li>
                                                ))}
                                                <li className="pt-2 mt-2 border-t border-yellow-200 flex justify-between font-bold">
                                                    <span>{selectedProduct.name}</span>
                                                    <span className="text-green-600">
                                                        +{formatQuantity(produceQty)} {selectedProduct.unit_label}
                                                    </span>
                                                </li>
                                            </ul>
                                        </div>

                                        {status === "error" && (
                                            <div className="p-3 bg-red-100 text-red-700 rounded-md flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                {errorMessage}
                                            </div>
                                        )}

                                        {status === "success" && (
                                            <div className="p-3 bg-green-100 text-green-700 rounded-md text-center font-semibold">
                                                Production Complete!
                                            </div>
                                        )}

                                        <Button
                                            className="w-full h-12 text-lg"
                                            onClick={handleProduce}
                                            disabled={status === "loading" || recipeItems.length === 0}
                                        >
                                            {status === "loading" ? "Processing..." : "Produce Stock"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
