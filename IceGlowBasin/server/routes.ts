import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";

// Extend Request interface to include session
interface SessionRequest extends Request {
  sessionID: string;
}
import { storage } from "./storage";
import { insertCartItemSchema, insertOrderSchema, type Order } from "@shared/schema";
import { z } from "zod";

// PayFast configuration - MUST use environment variables for security
if (!process.env.PAYFAST_MERCHANT_ID || !process.env.PAYFAST_MERCHANT_KEY) {
  throw new Error('Missing required PayFast credentials: PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY must be set');
}

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const PAYFAST_SANDBOX = process.env.NODE_ENV !== 'production';
const PAYFAST_URL = PAYFAST_SANDBOX 
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process';
const PAYFAST_VALIDATE_URL = PAYFAST_SANDBOX
  ? 'https://sandbox.payfast.co.za/eng/query/validate'
  : 'https://www.payfast.co.za/eng/query/validate';

// PayFast signature generation
function generatePayFastSignature(data: Record<string, any>, passphrase: string = ''): string {
  // Create parameter string
  let signatureData = '';
  const sortedKeys = Object.keys(data).sort();
  
  sortedKeys.forEach(key => {
    if (data[key] !== '' && data[key] !== null && data[key] !== undefined) {
      signatureData += `${key}=${encodeURIComponent(data[key]).replace(/ /g, '+')}&`;
    }
  });
  
  // Remove trailing '&'
  signatureData = signatureData.slice(0, -1);
  
  // Add passphrase if provided
  if (passphrase) {
    signatureData += `&passphrase=${encodeURIComponent(passphrase).replace(/ /g, '+')}`;
  }
  
  return createHash('md5').update(signatureData).digest('hex');
}

// Validate PayFast IPN with server-to-server verification
async function validatePayFastIPN(data: Record<string, any>): Promise<boolean> {
  try {
    const validateData = new URLSearchParams();
    Object.keys(data).forEach(key => {
      validateData.append(key, data[key]);
    });
    
    const response = await fetch(PAYFAST_VALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: validateData.toString()
    });
    
    const result = await response.text();
    return result.trim() === 'VALID';
  } catch (error) {
    console.error('PayFast IPN validation error:', error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching products: " + error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching product: " + error.message });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    try {
      const sessionId = (req as SessionRequest).sessionID;
      const cartItems = await storage.getCartItems(sessionId);
      
      // Enrich cart items with product details
      const enrichedItems = await Promise.all(
        cartItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          return {
            ...item,
            product
          };
        })
      );
      
      res.json(enrichedItems);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching cart: " + error.message });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const sessionId = (req as SessionRequest).sessionID;
      const validatedData = insertCartItemSchema.parse({
        ...req.body,
        sessionId
      });

      // Check if item already exists in cart
      const existingItems = await storage.getCartItems(sessionId);
      const existingItem = existingItems.find(
        item => item.productId === validatedData.productId && item.color === validatedData.color
      );

      if (existingItem) {
        // Update quantity if item exists
        const updatedItem = await storage.updateCartItemQuantity(
          existingItem.id, 
          existingItem.quantity + (validatedData.quantity || 1)
        );
        res.json(updatedItem);
      } else {
        // Add new item to cart
        const cartItem = await storage.addToCart(validatedData);
        res.json(cartItem);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Error adding to cart: " + error.message });
    }
  });

  app.put("/api/cart/:id", async (req, res) => {
    try {
      const { quantity } = req.body;
      if (quantity <= 0) {
        await storage.removeFromCart(req.params.id);
        return res.json({ message: "Item removed from cart" });
      }
      
      const updatedItem = await storage.updateCartItemQuantity(req.params.id, quantity);
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(updatedItem);
    } catch (error: any) {
      res.status(500).json({ message: "Error updating cart: " + error.message });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    try {
      const success = await storage.removeFromCart(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({ message: "Item removed from cart" });
    } catch (error: any) {
      res.status(500).json({ message: "Error removing from cart: " + error.message });
    }
  });

  // PayFast payment route - creates pending order and initiates payment
  app.post("/api/create-payment", async (req, res) => {
    try {
      const sessionId = (req as SessionRequest).sessionID;
      const { amount, email, customerInfo } = req.body;
      
      // Validate inputs
      if (!amount || !email || !customerInfo?.fullName || !customerInfo?.address) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get current cart items
      const cartItems = await storage.getCartItems(sessionId);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Calculate expected amount server-side for security
      let expectedTotal = 0;
      const enrichedItems = [];
      for (const item of cartItems) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }
        const itemTotal = parseFloat(product.price) * item.quantity;
        expectedTotal += itemTotal;
        enrichedItems.push({ ...item, product, itemTotal });
      }
      
      // Verify amount matches cart (within 1 cent tolerance for rounding)
      if (Math.abs(expectedTotal - parseFloat(amount)) > 0.01) {
        return res.status(400).json({ message: "Amount mismatch - please refresh your cart" });
      }
      
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create pending order BEFORE redirecting to PayFast
      const pendingOrder = await storage.createOrder({
        email,
        total: amount,
        status: "pending",
        payfastPaymentId: orderId,
        payfastPaymentStatus: "pending",
        shippingAddress: JSON.stringify(customerInfo),
        items: JSON.stringify(enrichedItems)
      });
      
      // PayFast payment data
      const paymentData = {
        merchant_id: PAYFAST_MERCHANT_ID,
        merchant_key: PAYFAST_MERCHANT_KEY,
        return_url: `${req.protocol}://${req.get('host')}/payment/success?order_id=${orderId}`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel?order_id=${orderId}`,
        notify_url: `${req.protocol}://${req.get('host')}/api/payfast-webhook`,
        item_name: 'CryoChill Product Order',
        item_description: `Order containing ${cartItems.length} items`,
        amount: parseFloat(amount).toFixed(2),
        m_payment_id: orderId,
        email_address: email,
        name_first: customerInfo?.fullName?.split(' ')[0] || 'Customer',
        name_last: customerInfo?.fullName?.split(' ').slice(1).join(' ') || '',
        email_confirmation: '1',
        confirmation_address: email
      };
      
      // Generate signature
      const signature = generatePayFastSignature(paymentData, PAYFAST_PASSPHRASE);
      const paymentDataWithSignature = { ...paymentData, signature };
      
      res.json({ 
        paymentData: paymentDataWithSignature,
        paymentUrl: PAYFAST_URL,
        orderId,
        orderDatabaseId: pendingOrder.id
      });
    } catch (error: any) {
      console.error('PayFast payment creation error:', error);
      res.status(500).json({ message: "Error creating payment: " + error.message });
    }
  });
  
  // PayFast webhook handler with proper IPN validation
  app.post("/api/payfast-webhook", async (req, res) => {
    try {
      const data = { ...req.body };
      
      // Step 1: Verify signature
      const receivedSignature = data.signature;
      delete data.signature;
      const calculatedSignature = generatePayFastSignature(data, PAYFAST_PASSPHRASE);
      
      if (receivedSignature !== calculatedSignature) {
        console.log('PayFast webhook signature verification failed');
        return res.status(400).send('Invalid signature');
      }
      
      // Step 2: Server-to-server validation with PayFast
      const isValidIPN = await validatePayFastIPN(req.body);
      if (!isValidIPN) {
        console.log('PayFast IPN validation failed');
        return res.status(400).send('Invalid IPN');
      }
      
      // Step 3: Process the verified payment
      const orderId = data.m_payment_id;
      const paymentStatus = data.payment_status;
      const amount = parseFloat(data.amount_gross || data.amount || '0');
      
      console.log(`PayFast webhook verified: Order ${orderId} status: ${paymentStatus} amount: ${amount}`);
      
      // Find the pending order
      const orders = await storage.getAllOrders();
      const order = orders.find((o: Order) => o.payfastPaymentId === orderId);
      
      if (!order) {
        console.log(`Order not found for PayFast payment ID: ${orderId}`);
        return res.status(404).send('Order not found');
      }
      
      // Verify amount matches expected order total
      const expectedAmount = parseFloat(order.total);
      if (Math.abs(amount - expectedAmount) > 0.01) {
        console.log(`Amount mismatch: expected ${expectedAmount}, received ${amount}`);
        return res.status(400).send('Amount mismatch');
      }
      
      // Update order status based on payment status
      let newStatus = 'pending';
      if (paymentStatus === 'COMPLETE') {
        newStatus = 'completed';
        
        // Clear cart and update stock on successful payment
        const orderItems = JSON.parse(order.items);
        for (const item of orderItems) {
          const product = await storage.getProduct(item.productId);
          if (product && product.stock >= item.quantity) {
            await storage.updateProductStock(item.productId, product.stock - item.quantity);
          }
        }
        
        // Clear the cart (we'd need to track session ID - for now just log)
        console.log(`Order ${orderId} completed - cart should be cleared`);
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        newStatus = 'failed';
      }
      
      // Update order with payment information
      await storage.updateOrderStatus(order.id, newStatus);
      
      // TODO: Send confirmation email here
      console.log(`Order ${order.id} updated to status: ${newStatus}`);
      
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('PayFast webhook error:', error.message);
      res.status(500).send(`Webhook Error: ${error.message}`);
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res) => {
    try {
      const sessionId = (req as SessionRequest).sessionID;
      const validatedData = insertOrderSchema.parse(req.body);
      
      // Get cart items for this session
      const cartItems = await storage.getCartItems(sessionId);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Create order
      const order = await storage.createOrder({
        ...validatedData,
        items: JSON.stringify(cartItems)
      });
      
      // Clear cart after successful order
      await storage.clearCart(sessionId);
      
      // Update product stock
      for (const item of cartItems) {
        const product = await storage.getProduct(item.productId);
        if (product) {
          await storage.updateProductStock(item.productId, product.stock - item.quantity);
        }
      }
      
      res.json(order);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating order: " + error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching order: " + error.message });
    }
  });

  // Payment success page
  app.get("/payment/success", (req, res) => {
    const orderId = req.query.order_id;
    res.redirect(`/?payment=success&order_id=${orderId}`);
  });
  
  // Payment cancel page
  app.get("/payment/cancel", (req, res) => {
    const orderId = req.query.order_id;
    res.redirect(`/?payment=cancelled&order_id=${orderId}`);
  });
  
  // Order status check endpoint
  app.get("/api/order-status/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const orders = await storage.getAllOrders();
      const order = orders.find((o: Order) => o.payfastPaymentId === orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json({
        id: order.id,
        status: order.status,
        payfastPaymentStatus: order.payfastPaymentStatus,
        total: order.total,
        email: order.email,
        createdAt: order.createdAt
      });
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching order status: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
