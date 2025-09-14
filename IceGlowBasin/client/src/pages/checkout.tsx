import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

const CheckoutForm = ({ cartItems, total }: { cartItems: any[], total: number }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    fullName: '',
    address: '',
    city: '',
    zipCode: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerInfo.email || !customerInfo.fullName || !customerInfo.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create PayFast payment
      const response = await apiRequest("POST", "/api/create-payment", {
        amount: total,
        email: customerInfo.email,
        items: cartItems.map((item: any) => ({
          id: item.productId,
          name: item.product?.name,
          quantity: item.quantity,
          price: item.product?.price
        })),
        customerInfo
      });

      const responseData = await response.json();
      const { paymentData, paymentUrl } = responseData;

      // Create a form and submit to PayFast
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentUrl;
      form.style.display = 'none';

      // Add all payment data as hidden inputs
      Object.keys(paymentData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = paymentData[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              placeholder="your@email.com"
              required
              data-testid="input-email"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="font-medium">Secure Payment with PayFast</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to PayFast's secure payment gateway to complete your purchase. 
              PayFast accepts credit cards, instant EFT, and other South African payment methods.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={customerInfo.fullName}
              onChange={(e) => setCustomerInfo({ ...customerInfo, fullName: e.target.value })}
              placeholder="John Doe"
              required
              data-testid="input-full-name"
            />
          </div>
          
          <div>
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={customerInfo.address}
              onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
              placeholder="123 Main St"
              required
              data-testid="input-address"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={customerInfo.city}
                onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                placeholder="Cape Town"
                required
                data-testid="input-city"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">Postal Code *</Label>
              <Input
                id="zipCode"
                value={customerInfo.zipCode}
                onChange={(e) => setCustomerInfo({ ...customerInfo, zipCode: e.target.value })}
                placeholder="8001"
                required
                data-testid="input-zip"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={isProcessing}
        data-testid="button-complete-order"
      >
        {isProcessing ? (
          <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        {isProcessing ? 'Redirecting to PayFast...' : `Pay R${total.toFixed(2)} with PayFast`}
      </Button>

      <div className="text-center text-xs text-muted-foreground">
        <Lock className="h-4 w-4 inline mr-1" />
        Secured by PayFast. Your payment information is encrypted and secure.
      </div>
    </form>
  );
};

export default function Checkout() {
  const { toast } = useToast();

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/cart"],
  });

  // Calculate totals (convert to ZAR - approximate exchange rate)
  const usdToZarRate = 18.5; // Approximate exchange rate
  const subtotalUSD = (cartItems as any[]).reduce((total: number, item: any) => {
    return total + (parseFloat(item.product?.price || 0) * item.quantity);
  }, 0);
  
  const subtotal = subtotalUSD * usdToZarRate;
  const shipping = subtotal > 500 ? 0 : 85; // Free shipping over R500
  const tax = subtotal * 0.15; // 15% VAT
  const total = subtotal + shipping + tax;

  // Check for payment status from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Thank you for your purchase. Your order confirmation has been sent to your email.",
      });
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. Please try again if you wish to complete your order.",
        variant: "destructive",
      });
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Your cart is empty</h2>
              <p className="text-muted-foreground mb-4">Add some products to your cart to proceed with checkout.</p>
              <Link href="/">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Secure Checkout</h1>
              <p className="text-muted-foreground">Complete your order securely with PayFast</p>
            </div>
            <Link href="/">
              <Button variant="ghost" data-testid="button-back-to-shop">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shop
              </Button>
            </Link>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {(cartItems as any[]).map((item: any) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                          <img
                            src={item.product?.images?.[0]}
                            alt={item.product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.color}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">R{(parseFloat(item.product?.price || 0) * usdToZarRate).toFixed(2)}</span>
                            <Badge variant="secondary">Qty: {item.quantity}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span data-testid="text-subtotal">R{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span data-testid="text-shipping">
                        {shipping === 0 ? 'FREE' : `R${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VAT (15%):</span>
                      <span data-testid="text-tax">R{tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span data-testid="text-total">R{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>💳 Credit Cards, Debit Cards</p>
                    <p>🏦 Instant EFT, SnapScan, Zapper</p>
                    <p>📱 Mobile Payments</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <CheckoutForm cartItems={cartItems as any[]} total={total} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}