import { currency, estimateProductSubtotal } from "../lib/estimate";
import type { Product, SelectedProduct } from "../types";

interface ProductSelectorProps {
  products: Product[];
  selectedProducts: SelectedProduct[];
  onSelectionChange: (selectedProducts: SelectedProduct[]) => void;
  measuredLength: number | null;
}

export const ProductSelector = ({ products, selectedProducts, onSelectionChange, measuredLength }: ProductSelectorProps) => {
  const updateSelection = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      onSelectionChange(selectedProducts.filter((entry) => entry.productId !== productId));
      return;
    }

    const match = selectedProducts.find((entry) => entry.productId === productId);
    if (match) {
      onSelectionChange(selectedProducts.map((entry) => (entry.productId === productId ? { ...entry, quantity } : entry)));
      return;
    }

    onSelectionChange([...selectedProducts, { productId, quantity }]);
  };

  const lookupQuantity = (productId: string) => {
    return selectedProducts.find((entry) => entry.productId === productId)?.quantity ?? 0;
  };

  return (
    <section className="panel panel-stack">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Step 2</p>
          <h2>Choose your preferred fence</h2>
          <p>
            {measuredLength
              ? `We have filled lineal metre products with your saved ${measuredLength} m measurement.`
              : "Save your fence length first, then choose the product you want priced."}
          </p>
        </div>
      </div>

      <div className="product-list">
        {products.map((product) => {
          const quantity = lookupQuantity(product.id);
          return (
            <article className="product-card" key={product.id}>
              <div>
                <div className="product-heading-row">
                  <h3>{product.name}</h3>
                  {product.isFeatured ? <span className="pill">Featured</span> : null}
                </div>
                <p>{product.description}</p>
                <div className="product-meta">
                  <span>
                    {currency.format(product.basePrice)} / {product.unit}
                  </span>
                  <span>{quantity > 0 ? `Subtotal ${currency.format(estimateProductSubtotal(product, quantity))}` : "Not selected"}</span>
                </div>
              </div>
              <label className="quantity-field">
                <span>{product.unit === "lineal metre" ? "Length" : "Quantity"}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(event) => updateSelection(product.id, Number(event.target.value))}
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
};
