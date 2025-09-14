import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, Truck, Shield, Award, Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { Product } from "@shared/schema";
import CartSidebar from "@/components/cart-sidebar";
import ProductTabs from "@/components/product-tabs";
import RelatedProducts from "@/components/related-products";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("Ocean Blue");
  const [quantity, setQuantity] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch main product
  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", "cryochill-bowl-main"],
  });

  // Fetch cart items
  const { data: cartItems = [] } = useQuery({
    queryKey: ["/api/cart"],
  });

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
      setShowCart(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product to cart.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
      color: selectedColor,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Navigate to checkout would be implemented here
  };

  const cartItemCount = cartItems?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Product not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const specifications = JSON.parse(product.specifications);
  const discountPercentage = product.originalPrice 
    ? Math.round(((parseFloat(product.originalPrice) - parseFloat(product.price)) / parseFloat(product.originalPrice)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-primary">CryoChill</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Products</a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCart(true)}
                data-testid="button-cart"
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Product Section */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform hover:scale-105"
                data-testid="img-product-main"
              />
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-muted rounded-md overflow-hidden cursor-pointer border-2 transition-colors ${
                    selectedImage === index ? 'border-primary' : 'border-transparent hover:border-primary'
                  }`}
                  data-testid={`button-thumbnail-${index}`}
                >
                  <img
                    src={image}
                    alt={`Product angle ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-product-title">
                {product.name}
              </h1>
              <p className="text-muted-foreground" data-testid="text-product-subtitle">
                Premium facial ice therapy bowl for spa-quality skincare at home
              </p>
            </div>

            {/* Price and Stock */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl font-bold text-foreground" data-testid="text-price">
                    ${product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through" data-testid="text-original-price">
                      ${product.originalPrice}
                    </span>
                  )}
                  {discountPercentage > 0 && (
                    <Badge variant="secondary" data-testid="badge-discount">
                      {discountPercentage}% OFF
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-muted-foreground" data-testid="text-stock">
                    {product.stock} in stock
                  </span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground" data-testid="text-rating">
                {product.rating} ({product.reviewCount} reviews)
              </span>
            </div>

            {/* Key Features */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Key Features:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Color:</h3>
              <div className="flex space-x-3">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 shadow-md ${
                      selectedColor === color ? 'border-primary' : 'border-border hover:border-primary'
                    } ${
                      color === 'Ocean Blue' ? 'bg-blue-400' :
                      color === 'Blush Pink' ? 'bg-pink-300' :
                      'bg-gray-300'
                    }`}
                    data-testid={`button-color-${color.toLowerCase().replace(' ', '-')}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-selected-color">
                Selected: {selectedColor}
              </p>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="font-semibold text-foreground">Quantity:</label>
                  <div className="flex items-center border border-border rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      data-testid="button-decrease-quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="px-4 py-2 border-x border-border min-w-[3rem] text-center" data-testid="text-quantity">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={quantity >= product.stock}
                      data-testid="button-increase-quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending || product.stock === 0}
                  className="w-full"
                  data-testid="button-add-to-cart"
                >
                  {addToCartMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleBuyNow}
                  disabled={addToCartMutation.isPending || product.stock === 0}
                  className="w-full"
                  data-testid="button-buy-now"
                >
                  Buy Now
                </Button>
              </div>
            </div>

            {/* Shipping Info */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Free Shipping</p>
                    <p className="text-sm text-muted-foreground">On orders over $25</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">30-Day Return Policy</p>
                    <p className="text-sm text-muted-foreground">Hassle-free returns</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Award className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">1-Year Warranty</p>
                    <p className="text-sm text-muted-foreground">Quality guaranteed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Product Information Tabs */}
      <ProductTabs product={product} specifications={specifications} />

      {/* Related Products */}
      <RelatedProducts />

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={showCart} 
        onClose={() => setShowCart(false)} 
      />
    </div>
  );
}
