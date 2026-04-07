"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { InventoryItem, Product, RecipeItem } from "@/lib/types";
import { formatQuantity } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight, Minus, Plus, Search } from "lucide-react";

type FlowStep = "select" | "execute";
const ALL_CATEGORY_VALUE = "__all__";
const CATALOG_PAGE_SIZE = 1000;

interface CategoryOption {
    value: string;
    label: string;
}

interface RecipeLineItem {
    ingredient_id: number;
    perUnitQty: number;
    ingredient?: Product;
}

interface ProductPlan {
    product: Product;
    batchQty: number;
    ingredientFilter: string;
    recipeItems: RecipeLineItem[];
    overrides: Record<number, number>;
    recipeLoaded: boolean;
    recipeError: string | null;
}

function normalizeText(value?: string | null): string {
    return (value ?? "").toLowerCase();
}

function normalizeCategoryKey(value?: string | null): string {
    return normalizeText(value).trim();
}

function getCategoryLabel(value?: string | null): string {
    const cleaned = (value ?? "").trim();
    return cleaned.length > 0 ? cleaned : "Uncategorized";
}

function isPieceUnit(product?: Product): boolean {
    return product?.unit_type === "piece";
}

function isWholeNumber(value: number): boolean {
    return Math.abs(value - Math.round(value)) < 1e-9;
}

function getStep(product?: Product): number {
    return isPieceUnit(product) ? 1 : 0.001;
}

function getButtonStep(): number {
    return 1;
}

function normalizeQuantity(value: number, step: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return step;
    }

    if (step === 1) {
        return Math.max(1, Math.round(value));
    }

    return Number(value.toFixed(3));
}

function createPlan(product: Product): ProductPlan {
    return {
        product,
        batchQty: 1,
        ingredientFilter: ALL_CATEGORY_VALUE,
        recipeItems: [],
        overrides: {},
        recipeLoaded: false,
        recipeError: null,
    };
}

function getDraftKey(productId: number, ingredientId: number): string {
    return `${productId}-${ingredientId}`;
}

export default function ProductionPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [inventoryByProductId, setInventoryByProductId] = useState<Record<number, number>>({});
    const [catalogLoading, setCatalogLoading] = useState(true);

    const [step, setStep] = useState<FlowStep>("select");
    const [productFilter, setProductFilter] = useState<string>(ALL_CATEGORY_VALUE);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    const [plans, setPlans] = useState<Record<number, ProductPlan>>({});
    const [activeProductId, setActiveProductId] = useState<number | null>(null);
    const [recipeLoading, setRecipeLoading] = useState(false);

    const [newIngredientId, setNewIngredientId] = useState<string>("");
    const [newIngredientQty, setNewIngredientQty] = useState<number | string>(0);
    const [ingredientQtyDrafts, setIngredientQtyDrafts] = useState<Record<string, string>>({});

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadCatalog = async () => {
        setCatalogLoading(true);

        try {
            const loadAllProducts = async (): Promise<Product[]> => {
                let skip = 0;
                const allProducts: Product[] = [];

                while (true) {
                    const response = await api.getProducts(undefined, undefined, skip, CATALOG_PAGE_SIZE);
                    const pageProducts = response.products || [];
                    allProducts.push(...pageProducts);

                    const totalProducts = response.total ?? allProducts.length;
                    if (pageProducts.length === 0 || allProducts.length >= totalProducts) {
                        break;
                    }

                    skip += pageProducts.length;
                }

                return allProducts;
            };

            const loadAllInventory = async (): Promise<InventoryItem[]> => {
                let skip = 0;
                const allInventoryItems: InventoryItem[] = [];

                while (true) {
                    const response = await api.getInventory(undefined, undefined, skip, CATALOG_PAGE_SIZE);
                    const pageItems = response.items || [];
                    allInventoryItems.push(...pageItems);

                    const totalItems = response.total ?? allInventoryItems.length;
                    if (pageItems.length === 0 || allInventoryItems.length >= totalItems) {
                        break;
                    }

                    skip += pageItems.length;
                }

                return allInventoryItems;
            };

            const [loadedProducts, loadedInventoryItems] = await Promise.all([
                loadAllProducts(),
                loadAllInventory(),
            ]);

            setProducts(loadedProducts);

            const inventoryMap: Record<number, number> = {};
            loadedInventoryItems.forEach((item) => {
                inventoryMap[item.product_id] = item.quantity;
            });
            setInventoryByProductId(inventoryMap);
        } catch (error) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : "Failed to load products and inventory.");
            setStatus("error");
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        void loadCatalog();
    }, []);

    useEffect(() => {
        setNewIngredientId("");
        setNewIngredientQty(0);
    }, [activeProductId]);

    const selectedIdSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);

    const selectedProducts = useMemo(
        () => selectedProductIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[],
        [selectedProductIds, products],
    );

    const productCategoryOptions = useMemo<CategoryOption[]>(() => {
        const map = new Map<string, string>();

        products.forEach((product) => {
            const raw = (product.category ?? "").trim();
            if (!raw) {
                return;
            }

            const key = normalizeCategoryKey(raw);
            if (!map.has(key)) {
                map.set(key, raw);
            }
        });

        return Array.from(map.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([value, label]) => ({ value, label }));
    }, [products]);

    const filteredProducts = useMemo(() => {
        const term = normalizeText(searchTerm).trim();

        return products.filter((product) => {
            const matchesCategory =
                productFilter === ALL_CATEGORY_VALUE ||
                normalizeCategoryKey(product.category) === productFilter;
            const matchesSearch =
                term.length === 0 ||
                normalizeText(product.name).includes(term) ||
                normalizeText(product.category).includes(term);

            return matchesCategory && matchesSearch;
        });
    }, [products, productFilter, searchTerm]);

    const updatePlan = (productId: number, updater: (plan: ProductPlan) => ProductPlan) => {
        setPlans((previous) => {
            const current = previous[productId];
            if (!current) {
                return previous;
            }

            return {
                ...previous,
                [productId]: updater(current),
            };
        });
    };

    const getRequiredQty = (plan: ProductPlan, line: RecipeLineItem): number => {
        const override = plan.overrides[line.ingredient_id];
        return override !== undefined ? override : line.perUnitQty * plan.batchQty;
    };

    const loadRecipesForProducts = async (productIds: number[]) => {
        if (productIds.length === 0) {
            return;
        }

        setRecipeLoading(true);

        try {
            const results = await Promise.all(
                productIds.map(async (productId) => {
                    try {
                        const recipe = await api.getRecipe(productId);
                        return {
                            productId,
                            items: recipe.items || [],
                            error: null as string | null,
                        };
                    } catch (error) {
                        return {
                            productId,
                            items: [] as RecipeItem[],
                            error: error instanceof Error ? error.message : "Failed to load recipe.",
                        };
                    }
                }),
            );

            setPlans((previous) => {
                const nextPlans = { ...previous };

                results.forEach((result) => {
                    const existingPlan = nextPlans[result.productId];
                    if (!existingPlan) {
                        return;
                    }

                    const mappedItems: RecipeLineItem[] = result.items.map((item) => {
                        const ingredient = products.find((product) => product.id === item.ingredient_id) || item.ingredient;
                        return {
                            ingredient_id: item.ingredient_id,
                            perUnitQty: Number(item.quantity),
                            ingredient,
                        };
                    });

                    nextPlans[result.productId] = {
                        ...existingPlan,
                        recipeItems: mappedItems,
                        recipeLoaded: true,
                        recipeError: result.error,
                    };
                });

                return nextPlans;
            });
        } finally {
            setRecipeLoading(false);
        }
    };

    const toggleProductSelection = (productId: number) => {
        setSelectedProductIds((previous) => {
            if (previous.includes(productId)) {
                return previous.filter((id) => id !== productId);
            }
            return [...previous, productId];
        });

        setStatus("idle");
        setErrorMessage("");
        setSuccessMessage("");
    };

    const handleContinue = async () => {
        if (selectedProductIds.length === 0) {
            return;
        }

        const availableIds = selectedProductIds.filter((id) => products.some((product) => product.id === id));
        if (availableIds.length === 0) {
            return;
        }

        setPlans((previous) => {
            const nextPlans: Record<number, ProductPlan> = {};

            availableIds.forEach((id) => {
                const product = products.find((entry) => entry.id === id);
                if (!product) {
                    return;
                }

                const existing = previous[id];
                nextPlans[id] = existing ? { ...existing, product } : createPlan(product);
            });

            return nextPlans;
        });

        const recipeIdsToFetch = availableIds.filter((id) => !plans[id]?.recipeLoaded);

        setActiveProductId((current) => (current && availableIds.includes(current) ? current : availableIds[0]));
        setStep("execute");
        setStatus("idle");
        setErrorMessage("");
        setSuccessMessage("");

        if (recipeIdsToFetch.length > 0) {
            await loadRecipesForProducts(recipeIdsToFetch);
        }
    };

    const activePlan = activeProductId ? plans[activeProductId] : null;

    const activeRows = useMemo(() => {
        if (!activePlan) {
            return [] as RecipeLineItem[];
        }

        if (activePlan.ingredientFilter === ALL_CATEGORY_VALUE) {
            return activePlan.recipeItems;
        }

        return activePlan.recipeItems.filter((item) => {
            return normalizeCategoryKey(item.ingredient?.category) === activePlan.ingredientFilter;
        });
    }, [activePlan]);

    const activeAvailableIngredients = useMemo(() => {
        if (!activePlan) {
            return [] as Product[];
        }

        const alreadyAdded = new Set(activePlan.recipeItems.map((item) => item.ingredient_id));
        return products.filter((product) => product.id !== activePlan.product.id && !alreadyAdded.has(product.id));
    }, [activePlan, products]);

    const filteredActiveAvailableIngredients = useMemo(() => {
        if (!activePlan) {
            return [] as Product[];
        }

        if (activePlan.ingredientFilter === ALL_CATEGORY_VALUE) {
            return activeAvailableIngredients;
        }

        return activeAvailableIngredients.filter((ingredient) => {
            return normalizeCategoryKey(ingredient.category) === activePlan.ingredientFilter;
        });
    }, [activeAvailableIngredients, activePlan]);

    const activeIngredientCategoryOptions = useMemo<CategoryOption[]>(() => {
        const map = new Map<string, string>();

        activeAvailableIngredients.forEach((ingredient) => {
            const raw = (ingredient.category ?? "").trim();
            if (!raw) {
                return;
            }

            const key = normalizeCategoryKey(raw);
            if (!map.has(key)) {
                map.set(key, raw);
            }
        });

        if (activePlan) {
            activePlan.recipeItems.forEach((item) => {
                const raw = (item.ingredient?.category ?? "").trim();
                if (!raw) {
                    return;
                }

                const key = normalizeCategoryKey(raw);
                if (!map.has(key)) {
                    map.set(key, raw);
                }
            });
        }

        return Array.from(map.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([value, label]) => ({ value, label }));
    }, [activeAvailableIngredients, activePlan]);

    const handleBatchInputChange = (productId: number, rawValue: string) => {
        if (rawValue === "") {
            return;
        }

        const currentPlan = plans[productId];
        if (!currentPlan) {
            return;
        }

        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return;
        }

        const stepValue = getStep(currentPlan.product);
        const normalized = normalizeQuantity(parsed, stepValue);

        updatePlan(productId, (plan) => ({
            ...plan,
            batchQty: normalized,
        }));
    };

    const adjustBatchQty = (productId: number, direction: -1 | 1) => {
        const currentPlan = plans[productId];
        if (!currentPlan) {
            return;
        }

        const inputStep = getStep(currentPlan.product);
        const buttonStep = getButtonStep();
        const candidate = currentPlan.batchQty + direction * buttonStep;
        const normalized = normalizeQuantity(Math.max(inputStep, candidate), inputStep);

        updatePlan(productId, (plan) => ({
            ...plan,
            batchQty: normalized,
        }));
    };

    const handleIngredientFilterChange = (filter: string) => {
        if (!activeProductId) {
            return;
        }

        updatePlan(activeProductId, (plan) => ({
            ...plan,
            ingredientFilter: filter,
        }));

        if (!newIngredientId || filter === ALL_CATEGORY_VALUE) {
            return;
        }

        const selectedIngredient = products.find((product) => product.id === Number(newIngredientId));
        if (!selectedIngredient) {
            setNewIngredientId("");
            return;
        }

        if (normalizeCategoryKey(selectedIngredient.category) !== filter) {
            setNewIngredientId("");
        }
    };

    const handleAddIngredient = () => {
        if (!activePlan || !newIngredientId || Number(newIngredientQty) <= 0) {
            return;
        }

        const ingredientId = Number(newIngredientId);
        const ingredient = products.find((product) => product.id === ingredientId);
        if (!ingredient) {
            return;
        }

        const parsedQty = Number(newIngredientQty);
        if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
            return;
        }

        if (isPieceUnit(ingredient) && !isWholeNumber(parsedQty)) {
            const popupMessage = `You entered floating number for piece unit type product ${ingredient.name}.`;
            window.alert(popupMessage);
            return;
        }

        if (activePlan.recipeItems.some((item) => item.ingredient_id === ingredientId)) {
            window.alert("Ingredient already added");
            return;
        }

        const perUnitQty = normalizeQuantity(parsedQty, getStep(ingredient));

        updatePlan(activePlan.product.id, (plan) => ({
            ...plan,
            recipeItems: [
                ...plan.recipeItems,
                {
                    ingredient_id: ingredient.id,
                    perUnitQty,
                    ingredient,
                },
            ],
            recipeError: null,
        }));

        setNewIngredientId("");
        setNewIngredientQty(0);
    };

    const handleRemoveIngredient = (productId: number, ingredientId: number) => {
        updatePlan(productId, (plan) => {
            const nextOverrides = { ...plan.overrides };
            delete nextOverrides[ingredientId];

            return {
                ...plan,
                recipeItems: plan.recipeItems.filter((item) => item.ingredient_id !== ingredientId),
                overrides: nextOverrides,
            };
        });

        setIngredientQtyDrafts((previous) => {
            const next = { ...previous };
            delete next[getDraftKey(productId, ingredientId)];
            return next;
        });
    };

    const setIngredientOverride = (productId: number, line: RecipeLineItem, nextQty: number) => {
        updatePlan(productId, (plan) => {
            const defaultQty = line.perUnitQty * plan.batchQty;
            const normalizedQty = normalizeQuantity(nextQty, getStep(line.ingredient));
            const nextOverrides = { ...plan.overrides };

            if (Math.abs(normalizedQty - defaultQty) < 1e-9) {
                delete nextOverrides[line.ingredient_id];
            } else {
                nextOverrides[line.ingredient_id] = normalizedQty;
            }

            return {
                ...plan,
                overrides: nextOverrides,
            };
        });
    };

    const adjustIngredientQty = (productId: number, line: RecipeLineItem, direction: -1 | 1) => {
        const currentPlan = plans[productId];
        if (!currentPlan) {
            return;
        }

        const inputStep = getStep(line.ingredient);
        const buttonStep = getButtonStep();
        const currentQty = getRequiredQty(currentPlan, line);
        const candidate = currentQty + direction * buttonStep;
        const normalized = normalizeQuantity(Math.max(inputStep, candidate), inputStep);

        setIngredientOverride(productId, line, normalized);
        setIngredientQtyDrafts((previous) => {
            const next = { ...previous };
            delete next[getDraftKey(productId, line.ingredient_id)];
            return next;
        });
    };

    const resetIngredientOverride = (productId: number, ingredientId: number) => {
        updatePlan(productId, (plan) => {
            const nextOverrides = { ...plan.overrides };
            delete nextOverrides[ingredientId];
            return {
                ...plan,
                overrides: nextOverrides,
            };
        });

        setIngredientQtyDrafts((previous) => {
            const next = { ...previous };
            delete next[getDraftKey(productId, ingredientId)];
            return next;
        });
    };

    const handleIngredientDraftChange = (productId: number, ingredientId: number, value: string) => {
        const key = getDraftKey(productId, ingredientId);
        setIngredientQtyDrafts((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    const handleIngredientDraftBlur = (productId: number, line: RecipeLineItem) => {
        const key = getDraftKey(productId, line.ingredient_id);
        const raw = ingredientQtyDrafts[key];

        if (raw === undefined) {
            return;
        }

        setIngredientQtyDrafts((previous) => {
            const next = { ...previous };
            delete next[key];
            return next;
        });

        if (raw.trim() === "") {
            return;
        }

        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return;
        }

        if (isPieceUnit(line.ingredient) && !isWholeNumber(parsed)) {
            const popupMessage = `You entered floating number for piece unit type product ${line.ingredient?.name ?? line.ingredient_id}.`;
            window.alert(popupMessage);
            return;
        }

        setIngredientOverride(productId, line, parsed);
    };

    const moveToNextProduct = () => {
        if (!activeProductId) {
            return;
        }

        const currentIndex = selectedProductIds.findIndex((id) => id === activeProductId);
        if (currentIndex < 0 || currentIndex >= selectedProductIds.length - 1) {
            return;
        }

        setActiveProductId(selectedProductIds[currentIndex + 1]);
    };

    const validatePlans = (): string | null => {
        for (const productId of selectedProductIds) {
            const plan = plans[productId];
            if (!plan) {
                return "Some selected products are not ready yet. Please try again.";
            }

            if (plan.batchQty <= 0) {
                return `Batch quantity must be greater than zero for ${plan.product.name}.`;
            }

            if (isPieceUnit(plan.product) && !isWholeNumber(plan.batchQty)) {
                return `Batch quantity for ${plan.product.name} must be a whole number.`;
            }

            if (plan.recipeItems.length === 0) {
                return `Please define at least one ingredient for ${plan.product.name}.`;
            }

            for (const line of plan.recipeItems) {
                const requiredQty = getRequiredQty(plan, line);
                if (!Number.isFinite(requiredQty) || requiredQty <= 0) {
                    return `Invalid ingredient quantity for ${line.ingredient?.name ?? line.ingredient_id} in ${plan.product.name}.`;
                }

                if (isPieceUnit(line.ingredient) && !isWholeNumber(requiredQty)) {
                    return `Ingredient ${line.ingredient?.name ?? line.ingredient_id} in ${plan.product.name} must be a whole number.`;
                }
            }
        }

        return null;
    };

    const handleProduceStock = async () => {
        const validationError = validatePlans();
        if (validationError) {
            setStatus("error");
            setErrorMessage(validationError);
            setSuccessMessage("");
            return;
        }

        setStatus("loading");
        setErrorMessage("");
        setSuccessMessage("");

        let successCount = 0;
        const failures: string[] = [];

        for (const productId of selectedProductIds) {
            const plan = plans[productId];
            if (!plan) {
                continue;
            }

            try {
                const customRecipe = plan.recipeItems.map((line) => {
                    const requiredQty = getRequiredQty(plan, line);
                    const perUnitQty = requiredQty / plan.batchQty;

                    return {
                        ingredient_id: line.ingredient_id,
                        quantity: Number(perUnitQty.toFixed(6)),
                    };
                });

                await api.executeProduction({
                    product_id: plan.product.id,
                    quantity: plan.batchQty,
                    custom_recipe: customRecipe,
                    persist_custom_recipe: false,
                });

                successCount += 1;
            } catch (error) {
                const message = error instanceof Error ? error.message : "Production failed";
                failures.push(`${plan.product.name}: ${message}`);
            }
        }

        if (successCount > 0) {
            await loadCatalog();
        }

        if (failures.length === 0) {
            setStatus("success");
            setSuccessMessage(`Produced ${successCount} ${successCount === 1 ? "product" : "products"} successfully.`);
            return;
        }

        setStatus("error");

        if (successCount > 0) {
            setErrorMessage(`Produced ${successCount} products, but some failed: ${failures.join(" | ")}`);
        } else {
            setErrorMessage(failures.join(" | "));
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f4f1ea]">
                <Header />
                <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">
                    <PageTransition>
                        <div className="mb-6 sm:mb-8">
                            <h2 className="mb-2 text-2xl font-semibold text-[#0b1d15] sm:text-3xl">Manufacturing</h2>
                            <p className="text-gray-600">Produce finished goods from ingredients</p>
                        </div>

                        {step === "select" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>1. Select Products</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="w-full sm:w-64">
                                        <Label className="mb-1 block text-xs text-gray-600">Category</Label>
                                        <Select value={productFilter} onValueChange={setProductFilter}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="All categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ALL_CATEGORY_VALUE}>All categories</SelectItem>
                                                {productCategoryOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder="Search product name"
                                            className="pl-9"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-700">
                                            {selectedProductIds.length} selected · {filteredProducts.length} visible
                                        </p>
                                        <Button
                                            type="button"
                                            className="h-9 bg-[#0b1d15] text-white hover:bg-[#0b1d15]/90"
                                            onClick={handleContinue}
                                            disabled={selectedProductIds.length === 0 || catalogLoading}
                                        >
                                            Continue with {selectedProductIds.length}
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {selectedProducts.length > 0 && (
                                        <div className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-2 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)] flex flex-wrap gap-2">
                                            {selectedProducts.map((product) => (
                                                <button
                                                    key={product.id}
                                                    type="button"
                                                    className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-[#0b1d15] hover:bg-gray-100"
                                                    onClick={() => toggleProductSelection(product.id)}
                                                >
                                                    {product.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="rounded-xl border border-[#0b1d15]/14 bg-white/95 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)] max-h-[56vh] overflow-y-auto">
                                        {catalogLoading && (
                                            <p className="p-4 text-sm text-gray-500">Loading products...</p>
                                        )}

                                        {!catalogLoading && filteredProducts.length === 0 && (
                                            <p className="p-4 text-sm text-gray-500">No products match the current filters.</p>
                                        )}

                                        {!catalogLoading && filteredProducts.length > 0 && (
                                            <div className="divide-y divide-gray-100">
                                                {filteredProducts.map((product) => {
                                                    const isSelected = selectedIdSet.has(product.id);

                                                    return (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            onClick={() => toggleProductSelection(product.id)}
                                                            className={`flex w-full items-start justify-between gap-3 p-3 text-left transition ${
                                                                isSelected ? "bg-[#eaf3ed]" : "hover:bg-gray-50"
                                                            }`}
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-[#0b1d15]">{product.name}</p>
                                                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                                    <Badge variant="outline" className="border-gray-300 text-gray-600">
                                                                            {getCategoryLabel(product.category)}
                                                                    </Badge>
                                                                    <span>{product.unit_label}</span>
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                readOnly
                                                                className="mt-1 h-4 w-4 rounded border-gray-300"
                                                                aria-label={`Select ${product.name}`}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {step === "execute" && (
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button type="button" variant="outline" onClick={() => setStep("select")}> 
                                        <ChevronLeft className="h-4 w-4" />
                                        Back to Product Selection
                                    </Button>
                                    <p className="text-sm text-gray-600">{selectedProductIds.length} products in this manufacturing session</p>
                                    {recipeLoading && <p className="text-sm text-gray-500">Loading recipes...</p>}
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>2. Recipe and Execute</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {selectedProducts.map((product, index) => {
                                                const plan = plans[product.id];
                                                const isActive = activeProductId === product.id;
                                                return (
                                                    <button
                                                        key={product.id}
                                                        type="button"
                                                        onClick={() => setActiveProductId(product.id)}
                                                        className={`min-w-44 rounded-lg border px-3 py-2 text-left transition ${
                                                            isActive
                                                                ? "border-[#0b1d15] bg-[#eaf3ed]"
                                                                : "border-gray-200 bg-white hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        <p className="truncate text-sm font-semibold text-[#0b1d15]">
                                                            {index + 1}. {product.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Qty: {formatQuantity(plan?.batchQty ?? 1)} {product.unit_label}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {!activePlan && (
                                            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                                Select a product tab to continue.
                                            </p>
                                        )}

                                        {activePlan && (
                                            <div className="space-y-4">
                                                <div className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-4 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)] space-y-4">
                                                    <div>
                                                        <h3 className="text-xl font-semibold text-[#0b1d15]">Recipe for {activePlan.product.name}</h3>
                                                        {activePlan.recipeError && (
                                                            <p className="mt-1 text-xs text-amber-700">
                                                                {activePlan.recipeError}. You can still add ingredients below.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Batch Quantity ({activePlan.product.unit_label})</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => adjustBatchQty(activePlan.product.id, -1)}
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                            <Input
                                                                type="number"
                                                                min={isPieceUnit(activePlan.product) ? "1" : "0.001"}
                                                                step={isPieceUnit(activePlan.product) ? "1" : "0.001"}
                                                                value={activePlan.batchQty}
                                                                onChange={(event) => handleBatchInputChange(activePlan.product.id, event.target.value)}
                                                                className="h-11 text-center text-lg font-semibold"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => adjustBatchQty(activePlan.product.id, 1)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                            <Badge variant="outline" className="border-gray-300 px-3 py-1 text-sm text-gray-600">
                                                                {activePlan.product.unit_label}
                                                            </Badge>
                                                        </div>
                                                        {isPieceUnit(activePlan.product) && (
                                                            <p className="text-xs text-gray-500">Whole numbers only for piece-based products.</p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                        <p className="mb-3 text-sm font-semibold text-[#0b1d15]">Add Ingredient</p>
                                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                                                            <Select value={newIngredientId} onValueChange={setNewIngredientId}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select ingredient" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {filteredActiveAvailableIngredients.map((ingredient) => (
                                                                        <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                                                                            {ingredient.name} ({ingredient.unit_label})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            <Input
                                                                type="number"
                                                                min="0.001"
                                                                step="0.001"
                                                                value={newIngredientQty}
                                                                onChange={(event) =>
                                                                    setNewIngredientQty(
                                                                        event.target.value === "" ? "" : Number(event.target.value),
                                                                    )
                                                                }
                                                                placeholder="Qty / 1 unit"
                                                            />

                                                            <Button
                                                                type="button"
                                                                onClick={handleAddIngredient}
                                                                disabled={!newIngredientId || Number(newIngredientQty) <= 0}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                                Add
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="w-full sm:w-64">
                                                        <Label className="mb-1 block text-xs text-gray-600">Ingredient Category</Label>
                                                        <Select
                                                            value={activePlan.ingredientFilter}
                                                            onValueChange={handleIngredientFilterChange}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="All categories" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value={ALL_CATEGORY_VALUE}>All categories</SelectItem>
                                                                {activeIngredientCategoryOptions.map((option) => (
                                                                    <SelectItem key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="rounded-lg border border-gray-200">
                                                        <div className="divide-y divide-gray-100 md:hidden">
                                                            {activeRows.length === 0 && (
                                                                <p className="py-6 text-center text-sm text-gray-500">
                                                                    No ingredients in this filter.
                                                                </p>
                                                            )}

                                                            {activeRows.map((line) => {
                                                                const requiredQty = getRequiredQty(activePlan, line);
                                                                const key = getDraftKey(activePlan.product.id, line.ingredient_id);
                                                                const draftValue = ingredientQtyDrafts[key];
                                                                const displayValue =
                                                                    draftValue !== undefined
                                                                        ? draftValue
                                                                        : Number(requiredQty.toFixed(3)).toString();
                                                                const stockQty = inventoryByProductId[line.ingredient_id] ?? 0;
                                                                const stockOk = stockQty + 1e-9 >= requiredQty;
                                                                const hasOverride = activePlan.overrides[line.ingredient_id] !== undefined;

                                                                return (
                                                                    <div key={line.ingredient_id} className="space-y-2 p-3">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="min-w-0">
                                                                                <p className="truncate font-medium text-[#0b1d15]">
                                                                                    {line.ingredient?.name ?? line.ingredient_id}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500">
                                                                                    {getCategoryLabel(line.ingredient?.category)}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex shrink-0 items-center gap-1">
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className={
                                                                                        stockOk
                                                                                            ? "border-green-200 bg-green-50 text-green-700"
                                                                                            : "border-amber-200 bg-amber-50 text-amber-700"
                                                                                    }
                                                                                >
                                                                                    {stockOk ? "OK" : "Low"}
                                                                                </Badge>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon-sm"
                                                                                    onClick={() =>
                                                                                        handleRemoveIngredient(
                                                                                            activePlan.product.id,
                                                                                            line.ingredient_id,
                                                                                        )
                                                                                    }
                                                                                    aria-label={`Remove ${line.ingredient?.name ?? line.ingredient_id}`}
                                                                                >
                                                                                    <Minus className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="icon-sm"
                                                                                onClick={() =>
                                                                                    adjustIngredientQty(
                                                                                        activePlan.product.id,
                                                                                        line,
                                                                                        -1,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Minus className="h-3 w-3" />
                                                                            </Button>
                                                                            <Input
                                                                                type="number"
                                                                                min={isPieceUnit(line.ingredient) ? "1" : "0.001"}
                                                                                step={isPieceUnit(line.ingredient) ? "1" : "0.001"}
                                                                                value={displayValue}
                                                                                onChange={(event) =>
                                                                                    handleIngredientDraftChange(
                                                                                        activePlan.product.id,
                                                                                        line.ingredient_id,
                                                                                        event.target.value,
                                                                                    )
                                                                                }
                                                                                onBlur={() =>
                                                                                    handleIngredientDraftBlur(activePlan.product.id, line)
                                                                                }
                                                                                onKeyDown={(event) => {
                                                                                    if (event.key === "Enter") {
                                                                                        (event.target as HTMLInputElement).blur();
                                                                                    }
                                                                                }}
                                                                                className="h-9 flex-1 text-right"
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="icon-sm"
                                                                                onClick={() =>
                                                                                    adjustIngredientQty(
                                                                                        activePlan.product.id,
                                                                                        line,
                                                                                        1,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Plus className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-xs text-gray-500">
                                                                                In stock: {formatQuantity(stockQty)} {line.ingredient?.unit_label}
                                                                            </span>
                                                                            {hasOverride && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-xs font-medium text-amber-700 hover:underline"
                                                                                    onClick={() =>
                                                                                        resetIngredientOverride(
                                                                                            activePlan.product.id,
                                                                                            line.ingredient_id,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Reset override
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="hidden overflow-x-auto md:block">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-gray-50">
                                                                        <TableHead>Ingredient</TableHead>
                                                                        <TableHead className="text-right">Qty / batch</TableHead>
                                                                        <TableHead className="text-right">Stock</TableHead>
                                                                        <TableHead className="w-10"></TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {activeRows.length === 0 && (
                                                                        <TableRow>
                                                                            <TableCell colSpan={4} className="py-6 text-center text-sm text-gray-500">
                                                                                No ingredients in this filter.
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}

                                                                    {activeRows.map((line) => {
                                                                        const requiredQty = getRequiredQty(activePlan, line);
                                                                        const key = getDraftKey(activePlan.product.id, line.ingredient_id);
                                                                        const draftValue = ingredientQtyDrafts[key];
                                                                        const displayValue =
                                                                            draftValue !== undefined
                                                                                ? draftValue
                                                                                : Number(requiredQty.toFixed(3)).toString();
                                                                        const stockQty = inventoryByProductId[line.ingredient_id] ?? 0;
                                                                        const stockOk = stockQty + 1e-9 >= requiredQty;
                                                                        const hasOverride = activePlan.overrides[line.ingredient_id] !== undefined;

                                                                        return (
                                                                            <TableRow key={line.ingredient_id}>
                                                                                <TableCell>
                                                                                    <div className="min-w-42">
                                                                                        <p className="font-medium text-[#0b1d15]">
                                                                                            {line.ingredient?.name ?? line.ingredient_id}
                                                                                        </p>
                                                                                        <p className="text-xs text-gray-500">
                                                                                            {getCategoryLabel(line.ingredient?.category)}
                                                                                        </p>
                                                                                        {hasOverride && (
                                                                                            <button
                                                                                                type="button"
                                                                                                className="mt-1 text-xs font-medium text-amber-700 hover:underline"
                                                                                                onClick={() =>
                                                                                                    resetIngredientOverride(
                                                                                                        activePlan.product.id,
                                                                                                        line.ingredient_id,
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                Reset override
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="icon-sm"
                                                                                            onClick={() =>
                                                                                                adjustIngredientQty(
                                                                                                    activePlan.product.id,
                                                                                                    line,
                                                                                                    -1,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Minus className="h-3 w-3" />
                                                                                        </Button>
                                                                                        <Input
                                                                                            type="number"
                                                                                            min={isPieceUnit(line.ingredient) ? "1" : "0.001"}
                                                                                            step={isPieceUnit(line.ingredient) ? "1" : "0.001"}
                                                                                            value={displayValue}
                                                                                            onChange={(event) =>
                                                                                                handleIngredientDraftChange(
                                                                                                    activePlan.product.id,
                                                                                                    line.ingredient_id,
                                                                                                    event.target.value,
                                                                                                )
                                                                                            }
                                                                                            onBlur={() =>
                                                                                                handleIngredientDraftBlur(activePlan.product.id, line)
                                                                                            }
                                                                                            onKeyDown={(event) => {
                                                                                                if (event.key === "Enter") {
                                                                                                    (event.target as HTMLInputElement).blur();
                                                                                                }
                                                                                            }}
                                                                                            className="h-9 w-28 text-right"
                                                                                        />
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="icon-sm"
                                                                                            onClick={() =>
                                                                                                adjustIngredientQty(
                                                                                                    activePlan.product.id,
                                                                                                    line,
                                                                                                    1,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Plus className="h-3 w-3" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="text-right">
                                                                                    <div className="flex flex-col items-end gap-1">
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className={
                                                                                                stockOk
                                                                                                    ? "border-green-200 bg-green-50 text-green-700"
                                                                                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                                                                            }
                                                                                        >
                                                                                            {stockOk ? "OK" : "Low"}
                                                                                        </Badge>
                                                                                        <span className="text-xs text-gray-500">
                                                                                            {formatQuantity(stockQty)} {line.ingredient?.unit_label}
                                                                                        </span>
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon-sm"
                                                                                        onClick={() =>
                                                                                            handleRemoveIngredient(
                                                                                                activePlan.product.id,
                                                                                                line.ingredient_id,
                                                                                            )
                                                                                        }
                                                                                        aria-label={`Remove ${line.ingredient?.name ?? line.ingredient_id}`}
                                                                                    >
                                                                                        <Minus className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                                        <h4 className="mb-3 flex items-center gap-2 font-semibold text-yellow-900">
                                                            <ArrowRight className="h-4 w-4" />
                                                            Stock Impact
                                                        </h4>

                                                        <div className="space-y-2 text-sm">
                                                            {activePlan.recipeItems.map((line) => {
                                                                const requiredQty = getRequiredQty(activePlan, line);
                                                                return (
                                                                    <div key={line.ingredient_id} className="flex items-center justify-between gap-2">
                                                                        <span className="truncate text-yellow-900">
                                                                            {line.ingredient?.name ?? line.ingredient_id}
                                                                        </span>
                                                                        <span className="font-mono font-semibold text-red-600">
                                                                            -{formatQuantity(requiredQty)} {line.ingredient?.unit_label}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}

                                                            <div className="mt-2 border-t border-yellow-200 pt-2">
                                                                <div className="flex items-center justify-between gap-2 font-semibold">
                                                                    <span className="text-yellow-900">{activePlan.product.name}</span>
                                                                    <span className="font-mono text-green-700">
                                                                        +{formatQuantity(activePlan.batchQty)} {activePlan.product.unit_label}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {status === "error" && (
                                                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="mt-0.5 h-4 w-4" />
                                                                <span>{errorMessage}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {status === "success" && (
                                                        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                                            <div className="flex items-center gap-2">
                                                                <Check className="h-4 w-4" />
                                                                <span>{successMessage}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="rounded-xl border border-[#0b1d15]/14 bg-white/95 p-4 shadow-[0_12px_28px_-20px_rgba(11,29,21,0.45)]">
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={moveToNextProduct}
                                                                disabled={
                                                                    !activeProductId ||
                                                                    selectedProductIds.findIndex((id) => id === activeProductId) ===
                                                                        selectedProductIds.length - 1
                                                                }
                                                            >
                                                                Next product
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                className="bg-black text-white hover:bg-black/90"
                                                                onClick={handleProduceStock}
                                                                disabled={status === "loading" || selectedProductIds.length === 0}
                                                            >
                                                                {status === "loading" ? "Processing..." : "Produce Stock"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </PageTransition>
                </main>
            </div>
        </ProtectedRoute>
    );
}
