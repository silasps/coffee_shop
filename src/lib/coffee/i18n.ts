import { catalogCategories } from "@/lib/coffee/catalog-data";
import type { Locale, MenuAreaSlug } from "@/lib/coffee/types";

type Dictionary = {
  localeLabel: string;
  homeKicker: string;
  heroTitle: string;
  heroDescription: string;
  heroPrimary: string;
  heroSecondary: string;
  catalogTitle: string;
  catalogSubtitle: string;
  detailLabel: string;
  addToCart: string;
  addedToCart: string;
  unavailable: string;
  pendingPrice: string;
  checkout: string;
  manage: string;
  searchPlaceholder: string;
  categoriesLabel: string;
  orderModesTitle: string;
  orderModesText: string;
  paymentWarning: string;
  sectionsTitle: string;
  sectionsText: string;
  footerNote: string;
  cartEmpty: string;
  cartTitle: string;
  cartSubtitle: string;
  subtotal: string;
  continueShopping: string;
  proceedToCheckout: string;
  checkoutTitle: string;
  checkoutDescription: string;
  customerName: string;
  tableLabel: string;
  orderNotes: string;
  orderChannel: string;
  paymentMethod: string;
  placeOrder: string;
  placingOrder: string;
  orderSuccess: string;
  counterPaymentNote: string;
  orderCreatedCounter: string;
  orderCreatedDirect: string;
  viewSellerBoard: string;
  backToMenu: string;
  callNameHint: string;
  areaNames: Record<MenuAreaSlug, string>;
  areaDescriptions: Record<MenuAreaSlug, string>;
  checkoutChannels: Record<string, string>;
  paymentMethods: Record<string, string>;
};

export const dictionaries: Record<Locale, Dictionary> = {
  pt: {
    localeLabel: "Português",
    homeKicker: "Cafeteria AT",
    heroTitle: "Um cardápio vivo para balcão, mesa e totem no mesmo fluxo.",
    heroDescription:
      "A base já nasce pronta para catálogo público, carrinho, pedido com nome para chamada e gestão operacional separada por vendedor, administrador e financeiro.",
    heroPrimary: "Explorar cardápio",
    heroSecondary: "Abrir acessos internos",
    catalogTitle: "Cardápio",
    catalogSubtitle:
      "As informações são cadastradas em português e a interface pública já está preparada para português, inglês e espanhol.",
    detailLabel: "Detalhes",
    addToCart: "Adicionar ao carrinho",
    addedToCart: "Item adicionado",
    unavailable: "Indisponível",
    pendingPrice: "Preço a confirmar",
    checkout: "Finalizar pedido",
    manage: "Gestão",
    searchPlaceholder: "Buscar no cardápio",
    categoriesLabel: "Seções",
    orderModesTitle: "Mesmo fluxo, origens diferentes",
    orderModesText:
      "Pedidos feitos na mesa, no balcão ou no totem entram na mesma fila de preparo e aparecem para o vendedor com destaque visual.",
    paymentWarning:
      "Se o cliente escolher pagar no balcão, o preparo só começa após confirmação do pagamento no painel do vendedor.",
    sectionsTitle: "Navegação inspirada em totem",
    sectionsText:
      "No desktop, as áreas funcionam como um menu contínuo. No mobile, as seções aparecem em chips fixos para acesso rápido.",
    footerNote:
      "Base inicial do projeto pronta para evoluir com gateway de pagamento, autenticação e upload real de imagens.",
    cartEmpty: "Seu carrinho está vazio no momento.",
    cartTitle: "Carrinho",
    cartSubtitle: "Monte seu pedido e finalize quando estiver pronto.",
    subtotal: "Subtotal",
    continueShopping: "Continuar comprando",
    proceedToCheckout: "Ir para pagamento",
    checkoutTitle: "Finalização do pedido",
    checkoutDescription:
      "Peça o nome do cliente para chamada quando o pedido estiver pronto.",
    customerName: "Nome para chamada",
    tableLabel: "Mesa ou referência",
    orderNotes: "Observações",
    orderChannel: "Origem do pedido",
    paymentMethod: "Forma de pagamento",
    placeOrder: "Enviar pedido",
    placingOrder: "Enviando pedido...",
    orderSuccess: "Pedido criado com sucesso",
    counterPaymentNote:
      "Aviso importante: o preparo só será iniciado depois do pagamento confirmado no balcão.",
    orderCreatedCounter:
      "Seu pedido entrou em espera de pagamento. Após a confirmação no balcão, ele seguirá para produção.",
    orderCreatedDirect:
      "Pedido pago. Ele já entrou na fila de preparo e vai aparecer no painel do vendedor.",
    viewSellerBoard: "Abrir painel do vendedor",
    backToMenu: "Voltar ao cardápio",
    callNameHint: "Ex.: Ana, Mesa 8, Retirada João",
    areaNames: {
      foods: "Comidas",
      "hot-drinks": "Bebidas Quentes",
      "cold-drinks": "Bebidas Geladas",
    },
    areaDescriptions: {
      foods: "Croissants, tapiocas, salgados e sobremesas.",
      "hot-drinks": "Espressos, métodos, cappuccinos, chocolates e chás.",
      "cold-drinks": "Cafés gelados, sucos, sodas, bebidas e milkshakes.",
    },
    checkoutChannels: {
      TABLE: "Pedido na mesa",
      COUNTER: "Pedido no balcão",
      TOTEM: "Pedido no totem",
    },
    paymentMethods: {
      ONLINE_CARD: "Cartão online",
      PAY_LINK: "Link de pagamento",
      PIX: "Pix",
      PAY_AT_COUNTER: "Pagar no balcão",
      CASH_AT_COUNTER: "Dinheiro no balcão",
      CARD_AT_COUNTER: "Cartão no balcão",
    },
  },
  en: {
    localeLabel: "English",
    homeKicker: "Cafeteria AT",
    heroTitle: "A live menu for counter, table service, and kiosk in one flow.",
    heroDescription:
      "This foundation already covers a public catalog, cart, name-based pickup flow, and separate operations areas for seller, admin, and finance.",
    heroPrimary: "Browse the menu",
    heroSecondary: "Open internal access",
    catalogTitle: "Menu",
    catalogSubtitle:
      "Content is entered in Portuguese and the public interface is ready for Portuguese, English, and Spanish.",
    detailLabel: "Details",
    addToCart: "Add to cart",
    addedToCart: "Added to cart",
    unavailable: "Unavailable",
    pendingPrice: "Price pending",
    checkout: "Checkout",
    manage: "Management",
    searchPlaceholder: "Search the menu",
    categoriesLabel: "Sections",
    orderModesTitle: "Different order origins, same kitchen flow",
    orderModesText:
      "Orders from tables, the counter, or the kiosk land in the same preparation queue and are highlighted for the seller.",
    paymentWarning:
      "If the guest chooses to pay at the counter, preparation only starts after payment is confirmed by the seller.",
    sectionsTitle: "Kiosk-inspired navigation",
    sectionsText:
      "On desktop, areas behave like a continuous menu. On mobile, sections stay available as quick chips.",
    footerNote:
      "Initial project foundation ready to grow with payment gateway, authentication, and real image uploads.",
    cartEmpty: "Your cart is empty right now.",
    cartTitle: "Cart",
    cartSubtitle: "Build the order and check out when ready.",
    subtotal: "Subtotal",
    continueShopping: "Keep browsing",
    proceedToCheckout: "Go to payment",
    checkoutTitle: "Complete your order",
    checkoutDescription:
      "Ask for the guest's name so the team can call it when the order is ready.",
    customerName: "Pickup name",
    tableLabel: "Table or reference",
    orderNotes: "Notes",
    orderChannel: "Order origin",
    paymentMethod: "Payment method",
    placeOrder: "Place order",
    placingOrder: "Submitting order...",
    orderSuccess: "Order created successfully",
    counterPaymentNote:
      "Important: preparation will only begin after payment is confirmed at the counter.",
    orderCreatedCounter:
      "Your order is waiting for payment. Once the counter team confirms it, it will move to production.",
    orderCreatedDirect:
      "Your order is paid and already moved into the preparation queue.",
    viewSellerBoard: "Open seller board",
    backToMenu: "Back to the menu",
    callNameHint: "Example: Ana, Table 8, Pickup John",
    areaNames: {
      foods: "Food",
      "hot-drinks": "Hot Drinks",
      "cold-drinks": "Cold Drinks",
    },
    areaDescriptions: {
      foods: "Croissants, tapiocas, savory snacks, and desserts.",
      "hot-drinks": "Espresso, brew methods, cappuccinos, chocolates, and teas.",
      "cold-drinks": "Iced coffees, juices, sodas, bottled drinks, and milkshakes.",
    },
    checkoutChannels: {
      TABLE: "Table order",
      COUNTER: "Counter order",
      TOTEM: "Kiosk order",
    },
    paymentMethods: {
      ONLINE_CARD: "Online card",
      PAY_LINK: "Payment link",
      PIX: "Pix",
      PAY_AT_COUNTER: "Pay at the counter",
      CASH_AT_COUNTER: "Cash at the counter",
      CARD_AT_COUNTER: "Card at the counter",
    },
  },
  es: {
    localeLabel: "Español",
    homeKicker: "Cafeteria AT",
    heroTitle: "Un menú vivo para barra, mesa y tótem en un solo flujo.",
    heroDescription:
      "La base ya nace lista para catálogo público, carrito, pedido con nombre para llamada y áreas separadas para vendedor, administración y finanzas.",
    heroPrimary: "Explorar el menú",
    heroSecondary: "Abrir accesos internos",
    catalogTitle: "Menú",
    catalogSubtitle:
      "La información se registra en portugués y la interfaz pública ya está preparada para portugués, inglés y español.",
    detailLabel: "Detalles",
    addToCart: "Agregar al carrito",
    addedToCart: "Producto agregado",
    unavailable: "No disponible",
    pendingPrice: "Precio pendiente",
    checkout: "Finalizar compra",
    manage: "Gestión",
    searchPlaceholder: "Buscar en el menú",
    categoriesLabel: "Secciones",
    orderModesTitle: "Mismo flujo, distintos puntos de pedido",
    orderModesText:
      "Los pedidos hechos en mesa, barra o tótem entran en la misma cola de preparación y aparecen destacados para el vendedor.",
    paymentWarning:
      "Si el cliente elige pagar en la barra, la preparación solo empieza después de la confirmación del pago.",
    sectionsTitle: "Navegación inspirada en tótems",
    sectionsText:
      "En escritorio las áreas funcionan como un menú continuo. En móvil, las secciones se muestran como accesos rápidos.",
    footerNote:
      "Base inicial del proyecto lista para crecer con pasarela de pago, autenticación y carga real de imágenes.",
    cartEmpty: "Tu carrito está vacío por ahora.",
    cartTitle: "Carrito",
    cartSubtitle: "Arma el pedido y finaliza cuando quieras.",
    subtotal: "Subtotal",
    continueShopping: "Seguir comprando",
    proceedToCheckout: "Ir al pago",
    checkoutTitle: "Finaliza tu pedido",
    checkoutDescription:
      "Solicita el nombre del cliente para llamarlo cuando el pedido esté listo.",
    customerName: "Nombre para retiro",
    tableLabel: "Mesa o referencia",
    orderNotes: "Observaciones",
    orderChannel: "Origen del pedido",
    paymentMethod: "Método de pago",
    placeOrder: "Enviar pedido",
    placingOrder: "Enviando pedido...",
    orderSuccess: "Pedido creado con éxito",
    counterPaymentNote:
      "Importante: la preparación solo empezará después de la confirmación del pago en la barra.",
    orderCreatedCounter:
      "Tu pedido quedó esperando el pago. Cuando la barra lo confirme, seguirá a producción.",
    orderCreatedDirect:
      "El pedido ya está pagado y entró en la cola de preparación.",
    viewSellerBoard: "Abrir panel del vendedor",
    backToMenu: "Volver al menú",
    callNameHint: "Ej.: Ana, Mesa 8, Retiro Juan",
    areaNames: {
      foods: "Comidas",
      "hot-drinks": "Bebidas Calientes",
      "cold-drinks": "Bebidas Frías",
    },
    areaDescriptions: {
      foods: "Croissants, tapiocas, salados y postres.",
      "hot-drinks": "Espressos, métodos, cappuccinos, chocolates y tés.",
      "cold-drinks": "Cafés fríos, jugos, sodas, bebidas y milkshakes.",
    },
    checkoutChannels: {
      TABLE: "Pedido en mesa",
      COUNTER: "Pedido en barra",
      TOTEM: "Pedido en tótem",
    },
    paymentMethods: {
      ONLINE_CARD: "Tarjeta online",
      PAY_LINK: "Link de pago",
      PIX: "Pix",
      PAY_AT_COUNTER: "Pagar en barra",
      CASH_AT_COUNTER: "Efectivo en barra",
      CARD_AT_COUNTER: "Tarjeta en barra",
    },
  },
};

const categoryTranslations: Record<string, Partial<Record<Locale, { name: string; description: string }>>> =
  {
    "fried-savories": {
      en: {
        name: "Fried Savories",
        description: "Classic fried snacks served hot and crispy.",
      },
      es: {
        name: "Salados Fritos",
        description: "Clásicos fritos servidos calientes y crocantes.",
      },
    },
    "baked-savories": {
      en: {
        name: "Baked Savories",
        description: "Oven-baked savory bites for a lighter snack.",
      },
      es: {
        name: "Salados Horneados",
        description: "Opciones horneadas para una pausa más ligera.",
      },
    },
    "cheese-bread": {
      en: {
        name: "Cheese Bread",
        description: "Freshly baked every day with Minas cheese.",
      },
      es: {
        name: "Pan de Queso",
        description: "Preparado todos los días con queso de Minas.",
      },
    },
    "grilled-sandwiches": {
      en: {
        name: "Toasted Sandwiches",
        description: "Quick comfort options for table or counter service.",
      },
      es: {
        name: "Sándwiches Tostados",
        description: "Opciones rápidas para mesa o barra.",
      },
    },
    "savory-croissants": {
      en: {
        name: "Savory Croissants",
        description: "Buttery croissants filled like signature sandwiches.",
      },
      es: {
        name: "Croissants Salados",
        description: "Croissants rellenos como sándwiches de la casa.",
      },
    },
    "sweet-croissants": {
      en: {
        name: "Sweet Croissants",
        description: "Dessert-style croissants for an indulgent break.",
      },
      es: {
        name: "Croissants Dulces",
        description: "Croissants dulces para cerrar el pedido.",
      },
    },
    desserts: {
      en: {
        name: "Desserts",
        description: "Homemade cake slices to pair with coffee.",
      },
      es: {
        name: "Postres",
        description: "Porciones de pastel casero para acompañar el café.",
      },
    },
    tapiocas: {
      en: {
        name: "Tapiocas",
        description: "Sweet and savory tapiocas made to order.",
      },
      es: {
        name: "Tapiocas",
        description: "Tapiocas dulces y saladas hechas al momento.",
      },
    },
    crepiocas: {
      en: {
        name: "Crepiocas",
        description: "Tapioca crepes with eggs and a cheese crust.",
      },
      es: {
        name: "Crepiocas",
        description: "Crepes de tapioca con huevo y costra de queso.",
      },
    },
    "espresso-bar": {
      en: {
        name: "Espresso Bar",
        description: "Espresso and brew methods with 100% arabica beans.",
      },
      es: {
        name: "Barra de Espresso",
        description: "Espresso y métodos con granos 100% arábica.",
      },
    },
    teas: {
      en: {
        name: "Teas",
        description: "Hot fruit teas in 180 ml servings.",
      },
      es: {
        name: "Tés",
        description: "Tés frutales calientes en porciones de 180 ml.",
      },
    },
    cappuccinos: {
      en: {
        name: "Cappuccinos",
        description: "Classic cappuccino variations with chocolate and cinnamon.",
      },
      es: {
        name: "Cappuccinos",
        description: "Versiones clásicas con chocolate y canela.",
      },
    },
    "signature-hot-drinks": {
      en: {
        name: "Signature Hot Drinks",
        description: "House specials with espresso and toppings.",
      },
      es: {
        name: "Especiales Calientes",
        description: "Especiales de la casa con espresso y coberturas.",
      },
    },
    chocolates: {
      en: {
        name: "Chocolate Drinks",
        description: "Hot and chilled chocolate-based favorites.",
      },
      es: {
        name: "Chocolates",
        description: "Favoritos de chocolate, calientes o fríos.",
      },
    },
    "iced-coffees": {
      en: {
        name: "Iced Coffees",
        description: "Refreshing coffees with espresso, cream, and toppings.",
      },
      es: {
        name: "Cafés Fríos",
        description: "Cafés refrescantes con espresso y coberturas.",
      },
    },
    "cold-teas-and-lemonade": {
      en: {
        name: "Cold Tea & Lemonade",
        description: "Sparkling and refreshing tea-based drinks.",
      },
      es: {
        name: "Tés Fríos y Limonada",
        description: "Opciones refrescantes con té y limón.",
      },
    },
    sodas: {
      en: {
        name: "Sodas",
        description: "400 ml flavored sodas with bright fruit profiles.",
      },
      es: {
        name: "Sodas",
        description: "Sodas de 400 ml con perfiles frutales.",
      },
    },
    "cold-beverages": {
      en: {
        name: "Cold Beverages",
        description: "Bottled drinks, energy drinks, waters, and ready juices.",
      },
      es: {
        name: "Bebidas Frías",
        description: "Bebidas listas, energéticos, aguas y jugos.",
      },
    },
    "juices-and-vitaminas": {
      en: {
        name: "Juices & Smoothies",
        description: "Natural juices, fruit pulp blends, and the house smoothie.",
      },
      es: {
        name: "Jugos y Vitaminas",
        description: "Jugos naturales, pulpas y batidos de la casa.",
      },
    },
    "milkshakes-and-frappes": {
      en: {
        name: "Milkshakes & Frappes",
        description: "Creamy chilled drinks for dessert or afternoon breaks.",
      },
      es: {
        name: "Milkshakes y Frappés",
        description: "Bebidas cremosas para postre o merienda.",
      },
    },
  };

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.pt;
}

export function translateCategory(
  slug: string,
  locale: Locale,
  fallbackName: string,
  fallbackDescription?: string,
) {
  const match = categoryTranslations[slug]?.[locale];

  return {
    name: match?.name ?? fallbackName,
    description: match?.description ?? fallbackDescription ?? "",
  };
}

export function getAreaName(area: MenuAreaSlug, locale: Locale) {
  return getDictionary(locale).areaNames[area];
}

export function getAreaDescription(area: MenuAreaSlug, locale: Locale) {
  return getDictionary(locale).areaDescriptions[area];
}

export function isValidLocale(locale: string): locale is Locale {
  return locale === "pt" || locale === "en" || locale === "es";
}

export function getLocaleNavigation(currentLocale: Locale) {
  return Object.entries(dictionaries).map(([locale, dictionary]) => ({
    locale,
    label: dictionary.localeLabel,
    isActive: locale === currentLocale,
  }));
}

export function formatMoney(value: number | null, locale: Locale) {
  if (value === null) {
    return getDictionary(locale).pendingPrice;
  }

  const localeCode =
    locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US";

  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export const areaHeroBackgrounds: Record<MenuAreaSlug, string> = {
  foods:
    "linear-gradient(135deg, rgba(245, 193, 96, 0.24), rgba(245, 144, 76, 0.08))",
  "hot-drinks":
    "linear-gradient(135deg, rgba(89, 48, 34, 0.2), rgba(196, 136, 88, 0.08))",
  "cold-drinks":
    "linear-gradient(135deg, rgba(84, 149, 137, 0.18), rgba(94, 123, 178, 0.08))",
};

export const fallbackCategoryCount = catalogCategories.length;
