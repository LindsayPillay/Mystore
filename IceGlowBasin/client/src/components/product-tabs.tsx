import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Product } from "@shared/schema";

interface ProductTabsProps {
  product: Product;
  specifications: any;
}

export default function ProductTabs({ product, specifications }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState("description");

  const tabs = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${product.reviewCount})` },
    { id: "shipping", label: "Shipping" },
  ];

  const mockReviews = [
    {
      id: 1,
      name: "Sarah M.",
      rating: 5,
      date: "2 weeks ago",
      comment: "Amazing product! I use it every morning and the difference in my skin is incredible. The puffiness around my eyes has reduced significantly, and my skin feels so refreshed. Love that it's collapsible too!"
    },
    {
      id: 2,
      name: "Jennifer K.",
      rating: 5,
      date: "1 month ago",
      comment: "Perfect for my small bathroom! The collapsible design is genius. Quality feels premium and it's so easy to clean. My aesthetician recommended ice therapy and this makes it so convenient."
    },
    {
      id: 3,
      name: "Mike R.",
      rating: 4,
      date: "3 weeks ago",
      comment: "Great product overall. The silicone quality is excellent and it holds ice well. Only minor complaint is that it takes a moment to expand fully when first setting it up, but that's really nitpicking."
    }
  ];

  return (
    <section className="container mx-auto px-4 py-12 border-t border-border">
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                className={`py-4 px-2 border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`button-tab-${tab.id}`}
              >
                {tab.label}
              </Button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Description Tab */}
          {activeTab === "description" && (
            <div className="space-y-6" data-testid="panel-description">
              <h2 className="text-2xl font-bold text-foreground">Transform Your Skincare Routine</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Crafted from 100% food-grade silicone, our ice bath bowl is designed to withstand extreme temperatures while maintaining its shape and effectiveness. The collapsible design makes it perfect for travel or small spaces, folding down to just 2 inches tall for convenient storage.
              </p>
              
              <h3 className="text-xl font-semibold text-foreground">How to Use:</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Fill the bowl with cold water and ice cubes</li>
                <li>Cleanse your face with your regular skincare routine</li>
                <li>Dip your face or use with ice cubes for targeted treatment</li>
                <li>Follow with your favorite moisturizer or serum</li>
              </ol>
            </div>
          )}

          {/* Specifications Tab */}
          {activeTab === "specifications" && (
            <div className="space-y-6" data-testid="panel-specifications">
              <h2 className="text-2xl font-bold text-foreground">Technical Specifications</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {Object.entries(specifications).slice(0, 4).map(([key, value], index) => (
                    <div key={index} className="border-b border-border pb-2">
                      <span className="font-medium text-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-muted-foreground ml-2">{String(value)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {Object.entries(specifications).slice(4).map(([key, value], index) => (
                    <div key={index} className="border-b border-border pb-2">
                      <span className="font-medium text-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-muted-foreground ml-2">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === "reviews" && (
            <div className="space-y-6" data-testid="panel-reviews">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Customer Reviews</h2>
                <div className="flex items-center space-x-2">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating} out of 5 ({product.reviewCount} reviews)
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                {mockReviews.map((review) => (
                  <Card key={review.id} className="border border-border">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-foreground">{review.name}</span>
                            <div className="flex text-yellow-500 text-sm">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-current" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">Verified Purchase • {review.date}</p>
                        </div>
                        <Badge variant="outline">Verified</Badge>
                      </div>
                      <p className="text-muted-foreground">{review.comment}</p>
                    </CardContent>
                  </Card>
                ))}
                
                <Button variant="outline" className="w-full" data-testid="button-load-more-reviews">
                  Load More Reviews
                </Button>
              </div>
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === "shipping" && (
            <div className="space-y-6" data-testid="panel-shipping">
              <h2 className="text-2xl font-bold text-foreground">Shipping Information</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Shipping Options</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">Standard (5-7 business days)</span>
                      <span className="font-medium text-foreground">FREE</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">Express (2-3 business days)</span>
                      <span className="font-medium text-foreground">$9.99</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted-foreground">Overnight (1 business day)</span>
                      <span className="font-medium text-foreground">$24.99</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Return Policy</h3>
                  <p className="text-muted-foreground">
                    We offer a 30-day return policy for all unused items in original packaging. Free return shipping on defective items.
                  </p>
                  <p className="text-muted-foreground">
                    International shipping available to select countries. Additional duties and taxes may apply.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
