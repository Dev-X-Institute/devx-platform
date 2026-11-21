import type { Product } from "./demo";
import { useFormValidation } from "./forms";
export const feeNames = ["Tuition", "PTA dues", "ICT levy", "Exams fee"];
export function FeeEditor({ fees, save }: { fees: number[]; save: (fees: number[]) => void }) {
  const form = useFormValidation();
  return <form noValidate onSubmit={e => { e.preventDefault(); if (!form.validate(e.currentTarget)) return; const values = new FormData(e.currentTarget); save(feeNames.map((_, i) => Number(values.get(`fee-${i}`)))); }}>
    {feeNames.map((name, i) => <label key={name}>{name} (GH₵)<input {...form.props(`fee-${i}`)} type="number" inputMode="decimal" min="0" max="100000" step="0.01" required defaultValue={fees[i]} />{form.error(`fee-${i}`)}</label>)}<button className="button primary full">Save fee structure</button>
  </form>;
}
export function ProductEditor({ product, save }: { product: Product | "new"; save: (form: HTMLFormElement) => void }) {
  const form = useFormValidation();
  return <form noValidate onSubmit={e => { e.preventDefault(); if (form.validate(e.currentTarget)) save(e.currentTarget); }}><label>Item name<input {...form.props("name")} required maxLength={80} pattern=".*\S.*" defaultValue={product === "new" ? "" : product.name} />{form.error("name")}</label><div className="two-columns"><label>Price (GH₵)<input {...form.props("price")} required type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" defaultValue={product === "new" ? "" : product.price} />{form.error("price")}</label><label>Stock quantity<input {...form.props("stock")} required type="number" inputMode="numeric" min="0" max="100000" step="1" defaultValue={product === "new" ? "" : product.stock} />{form.error("stock")}</label></div><button className="button primary full">Save item</button></form>;
}
