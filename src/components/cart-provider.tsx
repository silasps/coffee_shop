"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { CartItem, MenuAreaSlug } from "@/lib/coffee/types";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
};

const CART_KEY = "coffee-shop-cart";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CART_KEY);

    if (!stored) {
      setHasLoadedCart(true);
      return;
    }

    try {
      setItems(JSON.parse(stored) as CartItem[]);
    } catch {
      window.localStorage.removeItem(CART_KEY);
    } finally {
      setHasLoadedCart(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedCart) {
      return;
    }

    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [hasLoadedCart, items]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const value: CartContextValue = {
    items,
    itemCount,
    subtotal,
    addItem(item) {
      setItems((current) => {
        const existing = current.find((entry) => entry.slug === item.slug);

        if (existing) {
          return current.map((entry) =>
            entry.slug === item.slug
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          );
        }

        return [...current, { ...item, quantity: 1 }];
      });
    },
    removeItem(slug) {
      setItems((current) => current.filter((item) => item.slug !== slug));
    },
    updateQuantity(slug, quantity) {
      setItems((current) =>
        current
          .map((item) => (item.slug === slug ? { ...item, quantity } : item))
          .filter((item) => item.quantity > 0),
      );
    },
    clear() {
      setItems([]);
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

export function useAddProduct() {
  const { addItem } = useCart();

  return ({
    slug,
    name,
    price,
    area,
  }: {
    slug: string;
    name: string;
    price: number;
    area: MenuAreaSlug;
  }) => addItem({ slug, name, price, area });
}
