import { type User, type InsertUser, type Product, type InsertProduct, type CartItem, type InsertCartItem, type Order, type InsertOrder } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProductStock(id: string, stock: number): Promise<Product | undefined>;

  // Cart
  getCartItems(sessionId: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(sessionId: string): Promise<boolean>;

  // Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private cartItems: Map<string, CartItem>;
  private orders: Map<string, Order>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.cartItems = new Map();
    this.orders = new Map();
    
    // Initialize with the main product
    this.initializeProducts();
  }

  private initializeProducts() {
    const mainProduct: Product = {
      id: "cryochill-bowl-main",
      name: "CryoChill Collapsible Silicone Ice Bath Bowl",
      description: "Experience the rejuvenating power of ice therapy with our premium CryoChill Collapsible Silicone Ice Bath Bowl. This innovative skincare tool brings spa-quality facial treatments to your home, helping reduce puffiness, tighten pores, and improve circulation for a radiant, youthful complexion.",
      price: "34.99",
      originalPrice: "49.99",
      stock: 47,
      images: [
        "https://images.unsplash.com/photo-1556227834-09f1de7a7d14?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=800",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200",
        "https://images.unsplash.com/photo-1522205408450-add114ad53fe?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=200&h=200"
      ],
      colors: ["Ocean Blue", "Blush Pink", "Pearl White"],
      features: [
        "100% Food-grade silicone construction",
        "Collapsible design saves 80% storage space",
        "Perfect temperature retention for ice therapy",
        "Easy to clean and dishwasher safe",
        "Reduces puffiness and improves circulation"
      ],
      specifications: JSON.stringify({
        material: "100% Food-grade Silicone",
        dimensionsExpanded: "12\" × 8\" × 6\"",
        dimensionsCollapsed: "12\" × 8\" × 2\"",
        weight: "1.2 lbs (544g)",
        temperatureRange: "-40°F to 450°F",
        capacity: "3.2 Liters",
        dishwasherSafe: "Yes",
        warranty: "1 Year Limited"
      }),
      rating: "4.8",
      reviewCount: 127,
      isActive: true
    };

    this.products.set(mainProduct.id, mainProduct);

    // Add related products
    const relatedProducts: Product[] = [
      {
        id: "jade-facial-roller",
        name: "Jade Facial Roller",
        description: "Enhance your ice therapy routine with this premium jade facial roller",
        price: "24.99",
        originalPrice: null,
        stock: 32,
        images: ["https://images.unsplash.com/photo-1596755389378-c31d21fd1273?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"],
        colors: ["Natural Jade"],
        features: ["Natural jade stone", "Ergonomic design", "Promotes lymphatic drainage"],
        specifications: JSON.stringify({ material: "Natural Jade", dimensions: "6\" × 2\"", weight: "0.3 lbs" }),
        rating: "4.6",
        reviewCount: 89,
        isActive: true
      },
      {
        id: "hydrating-face-serum",
        name: "Hydrating Face Serum",
        description: "Perfect post-ice therapy treatment for maximum hydration",
        price: "39.99",
        originalPrice: null,
        stock: 18,
        images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=400"],
        colors: ["Clear"],
        features: ["Hyaluronic acid formula", "Deeply moisturizing", "Anti-aging properties"],
        specifications: JSON.stringify({ size: "30ml", ingredients: "Hyaluronic Acid, Vitamin E", usage: "Apply twice daily" }),
        rating: "4.7",
        reviewCount: 156,
        isActive: true
      }
    ];

    relatedProducts.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Product methods
  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.isActive);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
  }

  async updateProductStock(id: string, stock: number): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (product) {
      product.stock = stock;
      this.products.set(id, product);
      return product;
    }
    return undefined;
  }

  // Cart methods
  async getCartItems(sessionId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values()).filter(
      item => item.sessionId === sessionId
    );
  }

  async addToCart(insertItem: InsertCartItem): Promise<CartItem> {
    const id = randomUUID();
    const item: CartItem = { 
      ...insertItem, 
      id, 
      createdAt: new Date()
    };
    this.cartItems.set(id, item);
    return item;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const item = this.cartItems.get(id);
    if (item) {
      item.quantity = quantity;
      this.cartItems.set(id, item);
      return item;
    }
    return undefined;
  }

  async removeFromCart(id: string): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(sessionId: string): Promise<boolean> {
    const itemsToRemove = Array.from(this.cartItems.values())
      .filter(item => item.sessionId === sessionId);
    
    itemsToRemove.forEach(item => {
      this.cartItems.delete(item.id);
    });
    
    return true;
  }

  // Order methods
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder, 
      id, 
      createdAt: new Date()
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      order.status = status;
      this.orders.set(id, order);
      return order;
    }
    return undefined;
  }
}

export const storage = new MemStorage();
