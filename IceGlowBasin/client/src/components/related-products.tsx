import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart } from "lucide-react";
import { Product } from "@shared/schema";

export default function RelatedProducts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter out the main product and get related products
  const relatedProducts = products.filter(product => 
    product.id !== "cryochill-bowl-main" && product.isActive
  );

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; color: string }) => {
      return apiRequest("POST", "/api/cart", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to Cart",
        description: "Product has been added to your cart successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product to cart.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = (product: Product) => {
    addToCartMutation.mutate({
      productId: product.id,
      quantity: 1,
      color: product.colors[0], // Default to first color
    });
  };

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Complete Your Skincare Routine</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border border-border overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-12 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Complete Your Skincare Routine</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {relatedProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="aspect-square bg-muted overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  data-testid={`img-related-${product.id}`}
                />
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-medium text-foreground" data-testid={`text-related-name-${product.id}`}>
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-related-desc-${product.id}`}>
                    {product.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-foreground" data-testid={`text-related-price-${product.id}`}>
                      ${product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(product)}
                    disabled={addToCartMutation.isPending || product.stock === 0}
                    data-testid={`button-add-related-${product.id}`}
                  >
                    {addToCartMutation.isPending ? (
                      <div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                </div>
                
                {product.stock === 0 && (
                  <p className="text-sm text-destructive">Out of stock</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
