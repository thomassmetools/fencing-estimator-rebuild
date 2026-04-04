import { useState } from "react";
import type { Product } from "../types";

interface AdminProductsTableProps {
  products: Product[];
  onSave: (products: Product[]) => Promise<void>;
  saveStatus: "idle" | "saving" | "saved";
}

const createBlankProduct = (): Product => ({
  id: crypto.randomUUID(),
  name: "New product",
  description: "Short product description",
  unit: "lineal metre",
  basePrice: 100,
});

export const AdminProductsTable = ({ products, onSave, saveStatus }: AdminProductsTableProps) => {
  const [draftProducts, setDraftProducts] = useState(products);
  const [error, setError] = useState<string | null>(null);

  const updateProduct = (productId: string, key: keyof Product, value: string | number | boolean) => {
    setDraftProducts((current) => current.map((product) => (product.id === productId ? { ...product, [key]: value } : product)));
  };

  const deleteProduct = (productId: string) => {
    setDraftProducts((current) => current.filter((product) => product.id !== productId));
  };

  const addProduct = () => {
    setDraftProducts((current) => [...current, createBlankProduct()]);
  };

  const handleSave = async () => {
    setError(null);
    try {
      await onSave(draftProducts);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save products.");
    }
  };

  return (
    <section className="panel admin-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Products</p>
          <h2>Contractor product selector</h2>
          <p>These records are what the customer sees and copies into their estimate request.</p>
        </div>
        <button type="button" className="primary" onClick={addProduct}>
          Add product
        </button>
      </div>

      <div className="admin-product-list">
        {draftProducts.map((product) => (
          <article className="admin-product-card" key={product.id}>
            <div className="admin-inline-grid">
              <label className="field-stack grow">
                <span>Name</span>
                <input value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} />
              </label>
              <label className="field-stack narrow">
                <span>Unit</span>
                <select value={product.unit} onChange={(event) => updateProduct(product.id, "unit", event.target.value)}>
                  <option value="lineal metre">lineal metre</option>
                  <option value="metre squared">metre squared</option>
                  <option value="each">each</option>
                </select>
              </label>
              <label className="field-stack narrow">
                <span>Base price</span>
                <input
                  type="number"
                  value={product.basePrice}
                  onChange={(event) => updateProduct(product.id, "basePrice", Number(event.target.value))}
                />
              </label>
            </div>
            <label className="field-stack">
              <span>Description</span>
              <textarea rows={2} value={product.description} onChange={(event) => updateProduct(product.id, "description", event.target.value)} />
            </label>
            <div className="action-row">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(product.isFeatured)}
                  onChange={(event) => updateProduct(product.id, "isFeatured", event.target.checked)}
                />
                <span>Featured on customer page</span>
              </label>
              <button type="button" onClick={() => deleteProduct(product.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="admin-footer">
        {error ? <p className="error-text">{error}</p> : null}
        {saveStatus === "saved" ? <p className="success-text">Products saved to Supabase.</p> : null}
        <button type="button" className="primary" onClick={() => void handleSave()} disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving..." : "Save products"}
        </button>
      </div>
    </section>
  );
};
