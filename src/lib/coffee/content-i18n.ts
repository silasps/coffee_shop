import type { Locale, LocalizedText } from "@/lib/coffee/types";

type TranslatableLocale = Exclude<Locale, "pt">;

type TranslationPair = Record<TranslatableLocale, string>;

type TranslationKind =
  | "store-slogan"
  | "store-description"
  | "category-name"
  | "category-description"
  | "product-name"
  | "product-description"
  | "product-highlight";

type GlossaryEntry = {
  pt: string;
} & TranslationPair;

function normalizeContent(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function capitalizeWords(value: string) {
  return value
    .split(/(\s+|[-/&])/)
    .map((part) =>
      /[\s\-\/&]/.test(part) ? part : capitalize(part),
    )
    .join("");
}

function looksAllCaps(value: string) {
  return value === value.toUpperCase();
}

function looksTitleCase(value: string) {
  return value
    .split(/[\s/-]+/)
    .filter(Boolean)
    .every((token) => token.charAt(0) === token.charAt(0).toUpperCase());
}

function applyReplacementCase(source: string, replacement: string) {
  if (looksAllCaps(source)) {
    return replacement.toUpperCase();
  }

  if (looksTitleCase(source)) {
    return capitalizeWords(replacement);
  }

  if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(source)) {
    return capitalize(replacement);
  }

  return replacement;
}

const exactTextTranslations: Record<string, TranslationPair> = {
  "De Tamandaré para o mundo.": {
    en: "From Tamandare to the world.",
    es: "De Tamandare al mundo.",
  },
  "Cardápio digital, pedidos e operação de cafeteria em uma mesma base reutilizável.": {
    en: "Digital menu, ordering, and cafe operations in one reusable foundation.",
    es: "Menu digital, pedidos y operacion de cafeteria en una misma base reutilizable.",
  },
  "Cardápio, operação e gestão financeira em uma base reutilizável para cafeterias.": {
    en: "Menu, operations, and financial management in one reusable cafe foundation.",
    es: "Menu, operacion y gestion financiera en una base reutilizable para cafeterias.",
  },
  "Mais pedido": {
    en: "Best seller",
    es: "Mas pedido",
  },
  "Preço pendente": {
    en: "Price pending",
    es: "Precio por confirmar",
  },
  "Preço a confirmar.": {
    en: "Price to be confirmed.",
    es: "Precio por confirmar.",
  },
};

const categorySlugTranslations: Record<
  string,
  Record<TranslatableLocale, { name: string; description: string }>
> = {
  "fried-savories": {
    en: {
      name: "Fried Savory Pastries",
      description: "Classic fried cafe snacks served hot and crisp.",
    },
    es: {
      name: "Salados Fritos",
      description: "Clasicos fritos de cafeteria, servidos calientes y crujientes.",
    },
  },
  "baked-savories": {
    en: {
      name: "Baked Savory Pastries",
      description: "Oven-baked savory bites for a lighter cafe break.",
    },
    es: {
      name: "Salados Horneados",
      description: "Opciones horneadas para una pausa mas ligera.",
    },
  },
  "cheese-bread": {
    en: {
      name: "Brazilian Cheese Bread",
      description: "Freshly baked pao de queijo made daily with Minas cheese.",
    },
    es: {
      name: "Pan de Queso Brasileno",
      description: "Pao de queijo horneado cada dia con queso Minas.",
    },
  },
  "grilled-sandwiches": {
    en: {
      name: "Toasted Sandwiches",
      description: "Fast, familiar sandwiches for counter or table service.",
    },
    es: {
      name: "Sandwiches Tostados",
      description: "Sandwiches rapidos y reconfortantes para barra o mesa.",
    },
  },
  "savory-croissants": {
    en: {
      name: "Savory Croissants",
      description: "Buttery croissants built like signature cafe sandwiches.",
    },
    es: {
      name: "Croissants Salados",
      description: "Croissants de mantequilla rellenos como sandwiches de la casa.",
    },
  },
  "sweet-croissants": {
    en: {
      name: "Sweet Croissants",
      description: "Dessert-style croissants to pair with coffee or tea.",
    },
    es: {
      name: "Croissants Dulces",
      description: "Croissants dulces para acompanar cafe o te.",
    },
  },
  desserts: {
    en: {
      name: "Desserts",
      description: "Homemade cake slices and sweet treats for the pastry case.",
    },
    es: {
      name: "Postres",
      description: "Porciones de bizcocho casero y dulces para la vitrina.",
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
      description: "Tapioca crepes with eggs and a light cheese crust.",
    },
    es: {
      name: "Crepiocas",
      description: "Crepes de tapioca con huevo y una ligera costra de queso.",
    },
  },
  "espresso-bar": {
    en: {
      name: "Espresso Bar",
      description: "Espresso and hand-brew methods, served cafe-style.",
    },
    es: {
      name: "Barra de Espresso",
      description: "Espresso y metodos de filtro servidos con estilo de cafeteria.",
    },
  },
  teas: {
    en: {
      name: "Teas",
      description: "Hot fruit teas in cafe-friendly portions.",
    },
    es: {
      name: "Tes",
      description: "Infusiones calientes de frutas en formato de cafeteria.",
    },
  },
  cappuccinos: {
    en: {
      name: "Cappuccinos",
      description: "Classic cappuccinos with comforting house variations.",
    },
    es: {
      name: "Cappuccinos",
      description: "Cappuccinos clasicos con variaciones reconfortantes de la casa.",
    },
  },
  "signature-hot-drinks": {
    en: {
      name: "Signature Hot Drinks",
      description: "House specialties with espresso, syrups, and toppings.",
    },
    es: {
      name: "Especiales Calientes",
      description: "Especiales de la casa con espresso, siropes y coberturas.",
    },
  },
  chocolates: {
    en: {
      name: "Chocolate Drinks",
      description: "Hot and chilled chocolate favorites for indulgent orders.",
    },
    es: {
      name: "Bebidas de Chocolate",
      description: "Favoritos de chocolate, calientes o frios, para pedidos golosos.",
    },
  },
  "iced-coffees": {
    en: {
      name: "Iced Coffees",
      description: "Refreshing espresso-based drinks with cream, syrups, and toppings.",
    },
    es: {
      name: "Cafes Frios",
      description: "Bebidas refrescantes a base de espresso con siropes y coberturas.",
    },
  },
  "cold-teas-and-lemonade": {
    en: {
      name: "Iced Teas & Lemonade",
      description: "Sparkling, refreshing tea drinks and house lemonade.",
    },
    es: {
      name: "Tes Frios y Limonada",
      description: "Bebidas refrescantes con te y limonada de la casa.",
    },
  },
  sodas: {
    en: {
      name: "House Sodas",
      description: "Colorful, fruit-forward Italian soda style drinks.",
    },
    es: {
      name: "Sodas",
      description: "Sodas coloridas y afrutadas al estilo de cafeteria.",
    },
  },
  "cold-beverages": {
    en: {
      name: "Cold Beverages",
      description: "Bottled drinks, sodas, energy drinks, and chilled staples.",
    },
    es: {
      name: "Bebidas Frias",
      description: "Bebidas embotelladas, refrescos, energeticos y opciones frias.",
    },
  },
  "juices-and-vitaminas": {
    en: {
      name: "Juices & Smoothies",
      description: "Fresh juices, fruit blends, and house smoothies.",
    },
    es: {
      name: "Zumos y Batidos",
      description: "Zumos frescos, pulpas batidas y batidos de la casa.",
    },
  },
  "milkshakes-and-frappes": {
    en: {
      name: "Milkshakes & Frappes",
      description: "Creamy chilled drinks made for dessert or an afternoon treat.",
    },
    es: {
      name: "Milkshakes y Frapes",
      description: "Bebidas cremosas y frias para postre o merienda.",
    },
  },
};

const productSlugNameTranslations: Record<string, TranslationPair> = {
  "coxinha-catupiry": {
    en: "Coxinha with Catupiry",
    es: "Coxinha con Catupiry",
  },
  "enrolado-salsicha": {
    en: "Sausage Roll",
    es: "Rollito de salchicha",
  },
  kibe: {
    en: "Kibbeh",
    es: "Quibe",
  },
  risoles: {
    en: "Risoles",
    es: "Risoles",
  },
  "esfiha-carne": {
    en: "Beef Sfihas",
    es: "Sfihas de carne",
  },
  "esfiha-presunto-queijo": {
    en: "Ham & Cheese Sfihas",
    es: "Sfihas de jamon y queso",
  },
  "empadao-frango": {
    en: "Chicken Pot Pie",
    es: "Empadao de pollo",
  },
  "empadinha-frango": {
    en: "Mini Chicken Pot Pie",
    es: "Empanadita de pollo",
  },
  "empadinha-palmito": {
    en: "Mini Heart of Palm Pie",
    es: "Empanadita de palmito",
  },
  "pao-de-queijo-pequeno": {
    en: "Mini Brazilian Cheese Bread",
    es: "Pan de queso brasileno pequeno",
  },
  "pao-de-queijo-grande": {
    en: "Large Brazilian Cheese Bread",
    es: "Pan de queso brasileno grande",
  },
  "misto-quente-oregano": {
    en: "Grilled Ham & Cheese with Oregano",
    es: "Sandwich mixto a la plancha con oregano",
  },
  "misto-quente-sem-oregano": {
    en: "Grilled Ham & Cheese",
    es: "Sandwich mixto a la plancha",
  },
  "misto-quente-duplo-oregano": {
    en: "Double Grilled Ham & Cheese with Oregano",
    es: "Sandwich mixto doble con oregano",
  },
  "misto-quente-duplo-sem-oregano": {
    en: "Double Grilled Ham & Cheese",
    es: "Sandwich mixto doble",
  },
  "croissant-bacon": {
    en: "Bacon Croissant",
    es: "Croissant de bacon",
  },
  "croissant-bacon-egg": {
    en: "Bacon, Egg & Cheese Croissant",
    es: "Croissant de bacon, huevo y queso",
  },
  "croissant-misto-quente": {
    en: "Ham & Cheese Croissant",
    es: "Croissant mixto",
  },
  "croissant-queijo-quente": {
    en: "Grilled Cheese Croissant",
    es: "Croissant de queso a la plancha",
  },
  "croissant-simples": {
    en: "Plain Butter Croissant",
    es: "Croissant clasico",
  },
  "croissant-crocante": {
    en: "Crunchy Nutella Croissant",
    es: "Croissant crujiente de Nutella",
  },
  "croissant-doce-de-leite-pacoca": {
    en: "Dulce de Leche & Pacoca Croissant",
    es: "Croissant de dulce de leche y pacoca",
  },
  "croissant-morango-nutella": {
    en: "Strawberry & Nutella Croissant",
    es: "Croissant de fresa y Nutella",
  },
  "croissant-romeu-julieta": {
    en: "Guava & Cheese Croissant",
    es: "Croissant de guayaba y queso",
  },
  "croissant-pistache": {
    en: "Pistachio Croissant",
    es: "Croissant de pistacho",
  },
  "bolo-caseiro-chocolate-ninho": {
    en: "Homestyle Chocolate Cake with Milk Cream",
    es: "Bizcocho casero de chocolate con crema de leche",
  },
  "bolo-caseiro-cenoura-chocolate": {
    en: "Homestyle Carrot Cake with Chocolate",
    es: "Bizcocho casero de zanahoria con chocolate",
  },
  "bolo-caseiro-limao-raspas": {
    en: "Homestyle Lemon Cake with Zest",
    es: "Bizcocho casero de limon con ralladura",
  },
  "tapioca-americana": {
    en: "American-Style Tapioca",
    es: "Tapioca americana",
  },
  "tapioca-misto-quente": {
    en: "Ham & Cheese Tapioca",
    es: "Tapioca mixta",
  },
  "tapioca-crocante": {
    en: "Crunchy Tapioca",
    es: "Tapioca crujiente",
  },
  "tapioca-desejo": {
    en: "Desire Tapioca",
    es: "Tapioca Deseo",
  },
  "tapioca-mineira": {
    en: "Minas-Style Tapioca",
    es: "Tapioca mineira",
  },
  "tapioca-moca": {
    en: "Sweet Milk Tapioca",
    es: "Tapioca de leche condensada",
  },
  "tapioca-pecado": {
    en: "Sinful Tapioca",
    es: "Tapioca Pecado",
  },
  "crepioca-simples": {
    en: "Ham & Cheese Crepioca",
    es: "Crepioca de jamon y queso",
  },
  "crepioca-americana": {
    en: "American-Style Crepioca",
    es: "Crepioca americana",
  },
  "crepioca-misto-quente": {
    en: "Ham & Cheese Crepioca",
    es: "Crepioca mixta",
  },
  "crepioca-queijo-quente": {
    en: "Grilled Cheese Crepioca",
    es: "Crepioca de queso a la plancha",
  },
  "espresso-pequeno": {
    en: "Single Espresso",
    es: "Espresso corto",
  },
  "espresso-grande": {
    en: "Long Espresso",
    es: "Espresso largo",
  },
  canelinha: {
    en: "Cinnamon Espresso",
    es: "Espresso con canela",
  },
  "espresso-com-leite": {
    en: "Espresso with Milk",
    es: "Espresso con leche",
  },
  machiato: {
    en: "Macchiato",
    es: "Macchiato",
  },
  "machiato-duplo": {
    en: "Double Macchiato",
    es: "Macchiato doble",
  },
  "cafe-coado": {
    en: "Filter Coffee",
    es: "Cafe de filtro",
  },
  "cha-maca-verde": {
    en: "Green Apple Tea",
    es: "Te de manzana verde",
  },
  "cha-pessego": {
    en: "Peach Tea",
    es: "Te de melocoton",
  },
  "cha-limao": {
    en: "Lemon Tea",
    es: "Te de limon",
  },
  "cha-frutas-vermelhas": {
    en: "Red Berry Tea",
    es: "Te de frutos rojos",
  },
  "cappuccino-belga": {
    en: "Belgian Chocolate Cappuccino",
    es: "Cappuccino con chocolate belga",
  },
  "cappuccino-chantilly": {
    en: "Whipped Cream Cappuccino",
    es: "Cappuccino con nata montada",
  },
  caramelow: {
    en: "Caramelow",
    es: "Caramelow",
  },
  "mocha-chocolate": {
    en: "Chocolate Mocha",
    es: "Mocha de chocolate",
  },
  "mocha-caramelo": {
    en: "Caramel Mocha",
    es: "Mocha de caramelo",
  },
  "mocha-leite-condensado": {
    en: "Condensed Milk Mocha",
    es: "Mocha de leche condensada",
  },
  "ovomaltine-leite-condensado": {
    en: "Ovomaltine with Condensed Milk",
    es: "Ovomaltine con leche condensada",
  },
  "chocolate-quente": {
    en: "Hot Chocolate",
    es: "Chocolate caliente",
  },
  "shake-gelado-chocolate": {
    en: "Iced Chocolate Shake",
    es: "Shake helado de chocolate",
  },
  "choco-max-nutella": {
    en: "Nutella Choco Max",
    es: "Choco Max de Nutella",
  },
  "coffee-caramelo-salgado": {
    en: "Salted Caramel Iced Coffee",
    es: "Coffee de caramelo salado",
  },
  "coffee-baunilha": {
    en: "Vanilla Iced Coffee",
    es: "Coffee de vainilla",
  },
  afogatto: {
    en: "Affogato",
    es: "Affogato",
  },
  "cappuccino-ice": {
    en: "Iced Cappuccino",
    es: "Cappuccino helado",
  },
  "cha-batido-maca-verde": {
    en: "Sparkling Green Apple Iced Tea",
    es: "Te frio de manzana verde con gas",
  },
  "cha-batido-limao": {
    en: "Sparkling Lemon Iced Tea",
    es: "Te frio de limon con gas",
  },
  "cha-batido-pessego": {
    en: "Sparkling Peach Iced Tea",
    es: "Te frio de melocoton con gas",
  },
  "cha-batido-frutas-vermelhas": {
    en: "Sparkling Red Berry Iced Tea",
    es: "Te frio de frutos rojos con gas",
  },
  "limonada-suica": {
    en: "Brazilian Swiss Lemonade",
    es: "Limonada suiza brasilena",
  },
  "soda-limao-siciliano": {
    en: "Sicilian Lemon Soda",
    es: "Soda de limon siciliano",
  },
  "soda-maca-verde": {
    en: "Green Apple Soda",
    es: "Soda de manzana verde",
  },
  "soda-blue-lemonade": {
    en: "Blue Lemonade Soda",
    es: "Soda Blue Lemonade",
  },
  "soda-pink-lemonade": {
    en: "Pink Lemonade Soda",
    es: "Soda Pink Lemonade",
  },
  "soda-cha-mate-tostado": {
    en: "Toasted Mate Tea Soda",
    es: "Soda de te mate tostado",
  },
  "soda-framboesa": {
    en: "Raspberry Soda",
    es: "Soda de frambuesa",
  },
  "soda-tangerina-gengibre": {
    en: "Tangerine & Ginger Soda",
    es: "Soda de mandarina y jengibre",
  },
  "refrigerante-mini": {
    en: "Mini Soda",
    es: "Refresco mini",
  },
  "refrigerante-lata": {
    en: "Canned Soda",
    es: "Refresco en lata",
  },
  "cha-mate-com-gas": {
    en: "Sparkling Mate Tea",
    es: "Te mate con gas",
  },
  "suco-caixinha": {
    en: "Juice Box",
    es: "Zumo en cajita",
  },
  achocolatado: {
    en: "Chocolate Milk Drink",
    es: "Batido de chocolate",
  },
  "suco-lata-com-gas": {
    en: "Sparkling Juice Can",
    es: "Zumo con gas en lata",
  },
  "cha-mate-copo": {
    en: "Cup of Iced Mate",
    es: "Vaso de te mate",
  },
  "agua-mineral-sem-gas": {
    en: "Still Mineral Water",
    es: "Agua mineral sin gas",
  },
  "agua-mineral-com-gas": {
    en: "Sparkling Mineral Water",
    es: "Agua mineral con gas",
  },
  "agua-saborizada": {
    en: "Flavored Water",
    es: "Agua saborizada",
  },
  "suco-natural-laranja": {
    en: "Fresh Orange Juice",
    es: "Zumo natural de naranja",
  },
  "suco-natural-abacaxi": {
    en: "Fresh Pineapple Juice",
    es: "Zumo natural de pina",
  },
  "suco-natural-limao": {
    en: "Fresh Lemon Juice",
    es: "Zumo natural de limon",
  },
  "suco-natural-morango": {
    en: "Fresh Strawberry Juice",
    es: "Zumo natural de fresa",
  },
  "suco-natural-mamao": {
    en: "Fresh Papaya Juice",
    es: "Zumo natural de papaya",
  },
  "suco-natural-melao": {
    en: "Fresh Melon Juice",
    es: "Zumo natural de melon",
  },
  "suco-natural-melancia": {
    en: "Fresh Watermelon Juice",
    es: "Zumo natural de sandia",
  },
  "polpa-abacaxi-hortela": {
    en: "Pineapple & Mint Fruit Blend",
    es: "Pulpa batida de pina con menta",
  },
  "polpa-acerola": {
    en: "Acerola Fruit Blend",
    es: "Pulpa batida de acerola",
  },
  "polpa-coco": {
    en: "Coconut Fruit Blend",
    es: "Pulpa batida de coco",
  },
  "polpa-manga": {
    en: "Mango Fruit Blend",
    es: "Pulpa batida de mango",
  },
  "polpa-maracuja": {
    en: "Passion Fruit Blend",
    es: "Pulpa batida de maracuya",
  },
  "polpa-melancia": {
    en: "Watermelon Fruit Blend",
    es: "Pulpa batida de sandia",
  },
  "polpa-morango": {
    en: "Strawberry Fruit Blend",
    es: "Pulpa batida de fresa",
  },
  "vitamina-banana-maca": {
    en: "Banana & Apple Smoothie",
    es: "Batido de banana y manzana",
  },
  "milkshake-morango": {
    en: "Strawberry Milkshake",
    es: "Milkshake de fresa",
  },
  "milkshake-creme": {
    en: "Vanilla Milkshake",
    es: "Milkshake de vainilla",
  },
  "milkshake-chocolate": {
    en: "Chocolate Milkshake",
    es: "Milkshake de chocolate",
  },
  "milkshake-ovomaltine": {
    en: "Ovomaltine Milkshake",
    es: "Milkshake de Ovomaltine",
  },
  "frappe-cafe": {
    en: "Coffee Frappe",
    es: "Frape de cafe",
  },
  "frappe-morango": {
    en: "Strawberry Frappe",
    es: "Frape de fresa",
  },
  "frappe-chocolate": {
    en: "Chocolate Frappe",
    es: "Frape de chocolate",
  },
};

const glossary: GlossaryEntry[] = [
  { pt: "leite condensado", en: "condensed milk", es: "leche condensada" },
  { pt: "frutas vermelhas", en: "red berries", es: "frutos rojos" },
  { pt: "maçã verde", en: "green apple", es: "manzana verde" },
  { pt: "limão siciliano", en: "Sicilian lemon", es: "limon siciliano" },
  { pt: "doce de leite", en: "dulce de leche", es: "dulce de leche" },
  { pt: "pão de queijo", en: "Brazilian cheese bread", es: "pan de queso brasileno" },
  { pt: "misto quente", en: "grilled ham and cheese", es: "sandwich mixto a la plancha" },
  { pt: "queijo quente", en: "grilled cheese", es: "queso a la plancha" },
  { pt: "café coado", en: "filter coffee", es: "cafe de filtro" },
  { pt: "chá batido", en: "sparkling iced tea", es: "te frio con gas" },
  { pt: "chocolate quente", en: "hot chocolate", es: "chocolate caliente" },
  { pt: "chantilly", en: "whipped cream", es: "nata montada" },
  { pt: "morango", en: "strawberry", es: "fresa" },
  { pt: "framboesa", en: "raspberry", es: "frambuesa" },
  { pt: "tangerina", en: "tangerine", es: "mandarina" },
  { pt: "gengibre", en: "ginger", es: "jengibre" },
  { pt: "pistache", en: "pistachio", es: "pistacho" },
  { pt: "goiabada", en: "guava paste", es: "guayaba" },
  { pt: "presunto", en: "ham", es: "jamon" },
  { pt: "queijo", en: "cheese", es: "queso" },
  { pt: "tomate", en: "tomato", es: "tomate" },
  { pt: "orégano", en: "oregano", es: "oregano" },
  { pt: "ovo", en: "egg", es: "huevo" },
  { pt: "ovos", en: "eggs", es: "huevos" },
  { pt: "bacon", en: "bacon", es: "bacon" },
  { pt: "caramelo salgado", en: "salted caramel", es: "caramelo salado" },
  { pt: "caramelo", en: "caramel", es: "caramelo" },
  { pt: "baunilha", en: "vanilla", es: "vainilla" },
  { pt: "limão", en: "lemon", es: "limon" },
  { pt: "pêssego", en: "peach", es: "melocoton" },
  { pt: "chocolate", en: "chocolate", es: "chocolate" },
  { pt: "cenoura", en: "carrot", es: "zanahoria" },
  { pt: "maçã", en: "apple", es: "manzana" },
  { pt: "banana", en: "banana", es: "banana" },
  { pt: "mamão", en: "papaya", es: "papaya" },
  { pt: "melão", en: "melon", es: "melon" },
  { pt: "melancia", en: "watermelon", es: "sandia" },
  { pt: "abacaxi", en: "pineapple", es: "pina" },
  { pt: "hortelã", en: "mint", es: "menta" },
  { pt: "acerola", en: "acerola", es: "acerola" },
  { pt: "coco", en: "coconut", es: "coco" },
  { pt: "manga", en: "mango", es: "mango" },
  { pt: "maracujá", en: "passion fruit", es: "maracuya" },
  { pt: "água com gás", en: "sparkling water", es: "agua con gas" },
  { pt: "sem gás", en: "still", es: "sin gas" },
  { pt: "com gás", en: "sparkling", es: "con gas" },
  { pt: "mineral", en: "mineral", es: "mineral" },
  { pt: "salgados", en: "savory pastries", es: "salados" },
  { pt: "salgado", en: "savory pastry", es: "salado" },
  { pt: "assados", en: "baked", es: "horneados" },
  { pt: "assado", en: "baked", es: "horneado" },
  { pt: "fritos", en: "fried", es: "fritos" },
  { pt: "frito", en: "fried", es: "frito" },
  { pt: "pequeno", en: "small", es: "pequeno" },
  { pt: "grande", en: "large", es: "grande" },
  { pt: "duplo", en: "double", es: "doble" },
  { pt: "simples", en: "plain", es: "clasico" },
  { pt: "gelado", en: "iced", es: "helado" },
  { pt: "gelada", en: "iced", es: "helada" },
  { pt: "gelados", en: "iced", es: "helados" },
  { pt: "quente", en: "hot", es: "caliente" },
  { pt: "quentes", en: "hot", es: "calientes" },
  { pt: "frase", en: "slogan", es: "frase" },
  { pt: "cafeteria", en: "cafe", es: "cafeteria" },
  { pt: "cardápio", en: "menu", es: "menu" },
  { pt: "pedidos", en: "orders", es: "pedidos" },
  { pt: "operação", en: "operations", es: "operacion" },
  { pt: "gestão financeira", en: "financial management", es: "gestion financiera" },
  { pt: "reutilizável", en: "reusable", es: "reutilizable" },
  { pt: "feito diariamente", en: "made fresh daily", es: "hecho cada dia" },
  { pt: "feito na hora", en: "made to order", es: "hecho al momento" },
  { pt: "servido quente", en: "served hot", es: "servido caliente" },
  { pt: "servida quente", en: "served hot", es: "servida caliente" },
  { pt: "com água", en: "blended with water", es: "batido con agua" },
  { pt: "caseiro", en: "homestyle", es: "casero" },
  { pt: "cremoso", en: "creamy", es: "cremoso" },
  { pt: "crocante", en: "crunchy", es: "crujiente" },
  { pt: "refrescante", en: "refreshing", es: "refrescante" },
  { pt: "natural", en: "fresh", es: "natural" },
  { pt: "vitamina", en: "smoothie", es: "batido" },
  { pt: "sucos", en: "juices", es: "zumos" },
  { pt: "suco", en: "juice", es: "zumo" },
  { pt: "milkshake", en: "milkshake", es: "milkshake" },
  { pt: "frapê", en: "frappe", es: "frape" },
];

const sortedGlossary = glossary
  .slice()
  .sort((left, right) => right.pt.length - left.pt.length);

function translateWithGlossary(value: string, locale: TranslatableLocale) {
  let result = value;

  for (const entry of sortedGlossary) {
    result = result.replace(new RegExp(escapeRegExp(entry.pt), "gi"), (match) =>
      applyReplacementCase(match, entry[locale]),
    );
  }

  return result
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function autoTranslateValue(
  value: string | null | undefined,
  locale: TranslatableLocale,
  options: {
    kind: TranslationKind;
    slug?: string;
  },
) {
  const normalized = normalizeContent(value);

  if (!normalized) {
    return null;
  }

  if (options.kind === "category-name") {
    return categorySlugTranslations[options.slug ?? ""]?.[locale]?.name ?? translateWithGlossary(normalized, locale);
  }

  if (options.kind === "category-description") {
    return (
      categorySlugTranslations[options.slug ?? ""]?.[locale]?.description ??
      exactTextTranslations[normalized]?.[locale] ??
      translateWithGlossary(normalized, locale)
    );
  }

  if (options.kind === "product-name") {
    return (
      productSlugNameTranslations[options.slug ?? ""]?.[locale] ??
      exactTextTranslations[normalized]?.[locale] ??
      translateWithGlossary(normalized, locale)
    );
  }

  return exactTextTranslations[normalized]?.[locale] ?? translateWithGlossary(normalized, locale);
}

export function fillLocalizedText(
  values: LocalizedText,
  options: {
    kind: TranslationKind;
    slug?: string;
  },
) {
  const pt = normalizeContent(values.pt);
  const en = normalizeContent(values.en);
  const es = normalizeContent(values.es);

  return {
    pt,
    en: en ?? (pt ? autoTranslateValue(pt, "en", options) : null),
    es: es ?? (pt ? autoTranslateValue(pt, "es", options) : null),
  };
}

export function resolveLocalizedText(
  locale: Locale,
  values: LocalizedText,
  options: {
    kind: TranslationKind;
    slug?: string;
  },
) {
  const pt = normalizeContent(values.pt);

  if (locale === "pt") {
    return pt;
  }

  const manual = normalizeContent(locale === "en" ? values.en : values.es);

  return manual ?? (pt ? autoTranslateValue(pt, locale, options) : null);
}

export function resolveStorefrontCopy(
  locale: Locale,
  store: {
    sloganPt?: string | null;
    sloganEn?: string | null;
    sloganEs?: string | null;
    storefrontDescriptionPt?: string | null;
    storefrontDescriptionEn?: string | null;
    storefrontDescriptionEs?: string | null;
  },
) {
  return {
    slogan: resolveLocalizedText(
      locale,
      {
        pt: store.sloganPt,
        en: store.sloganEn,
        es: store.sloganEs,
      },
      { kind: "store-slogan" },
    ),
    description: resolveLocalizedText(
      locale,
      {
        pt: store.storefrontDescriptionPt,
        en: store.storefrontDescriptionEn,
        es: store.storefrontDescriptionEs,
      },
      { kind: "store-description" },
    ),
  };
}

export function resolveCategoryCopy(
  locale: Locale,
  category: {
    slug: string;
    namePt: string;
    nameEn?: string | null;
    nameEs?: string | null;
    descriptionPt?: string | null;
    descriptionEn?: string | null;
    descriptionEs?: string | null;
  },
) {
  return {
    name:
      resolveLocalizedText(
        locale,
        {
          pt: category.namePt,
          en: category.nameEn,
          es: category.nameEs,
        },
        { kind: "category-name", slug: category.slug },
      ) ?? category.namePt,
    description:
      resolveLocalizedText(
        locale,
        {
          pt: category.descriptionPt,
          en: category.descriptionEn,
          es: category.descriptionEs,
        },
        { kind: "category-description", slug: category.slug },
      ) ?? "",
  };
}

export function resolveProductCopy(
  locale: Locale,
  product: {
    slug: string;
    namePt: string;
    nameEn?: string | null;
    nameEs?: string | null;
    descriptionPt?: string | null;
    descriptionEn?: string | null;
    descriptionEs?: string | null;
    highlightPt?: string | null;
    highlightEn?: string | null;
    highlightEs?: string | null;
  },
) {
  return {
    name:
      resolveLocalizedText(
        locale,
        {
          pt: product.namePt,
          en: product.nameEn,
          es: product.nameEs,
        },
        { kind: "product-name", slug: product.slug },
      ) ?? product.namePt,
    description:
      resolveLocalizedText(
        locale,
        {
          pt: product.descriptionPt,
          en: product.descriptionEn,
          es: product.descriptionEs,
        },
        { kind: "product-description", slug: product.slug },
      ) ?? "",
    highlight:
      resolveLocalizedText(
        locale,
        {
          pt: product.highlightPt,
          en: product.highlightEn,
          es: product.highlightEs,
        },
        { kind: "product-highlight", slug: product.slug },
      ) ?? null,
  };
}
