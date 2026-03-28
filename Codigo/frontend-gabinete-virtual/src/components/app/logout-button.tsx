import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, clearStoredToken, getStoredToken } from "../../lib/auth";

export function LogoutButton() {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    const token = getStoredToken();

    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);
    }

    clearStoredToken();
    navigate("/login", { replace: true });
    setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-background-strong disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isPending ? "Saindo..." : "Sair"}
    </button>
  );
}
