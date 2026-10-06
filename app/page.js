import { query } from "@/lib/db";
import { addItem, toggleItem, clearDone } from "./actions";

// La page lit la base à chaque requête (pas de rendu statique au build)
export const dynamic = "force-dynamic";

export default async function Home() {
  const { rows: items } = await query(
    "SELECT id, name, quantity, done FROM items ORDER BY done, created_at"
  );
  const remaining = items.filter((i) => !i.done).length;

  return (
    <main>
      <h1>Liste de courses</h1>
      <p className="count">{remaining} article(s) à acheter</p>

      <form action={addItem} className="add">
        <input name="name" placeholder="Ex : lait" required />
        <input name="quantity" type="number" min="1" defaultValue="1" />
        <button type="submit">Ajouter</button>
      </form>

      <ul>
        {items.map((item) => (
          <li key={item.id} className={item.done ? "done" : ""}>
            <form action={toggleItem}>
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="toggle">{item.done ? "✔" : "○"}</button>
            </form>
            <span>{item.name}</span>
            <span className="qty">x{item.quantity}</span>
          </li>
        ))}
      </ul>

      {items.some((i) => i.done) && (
        <form action={clearDone}>
          <button type="submit" className="clear">Retirer les articles achetés</button>
        </form>
      )}
    </main>
  );
}
