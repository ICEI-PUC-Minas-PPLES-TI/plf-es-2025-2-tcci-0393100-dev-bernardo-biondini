import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API_BASE_URL,
  extractApiError,
  getAccessProfiles,
  parseAuthResponse,
  storeToken,
} from "../../lib/auth";
import type { AccessProfileType } from "../../types/access-profile";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfileType[]>([]);

  useEffect(() => {
    if (mode !== "register") {
      return;
    }

    getAccessProfiles().then(setAccessProfiles).catch(() => setAccessProfiles([]));
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const accessProfileIdValue = formData.get("access_profile_id");
    const payload =
      mode === "register"
        ? {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            password_confirmation: String(
              formData.get("password_confirmation") ?? "",
            ),
            access_profile_id: accessProfileIdValue
              ? Number(accessProfileIdValue)
              : undefined,
            device_name: "vite-web",
          }
        : {
            email: String(formData.get("email") ?? ""),
            password: String(formData.get("password") ?? ""),
            device_name: "vite-web",
          };

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/${mode === "register" ? "register" : "login"}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await parseAuthResponse(response);
      storeToken(data.token);
      navigate("/painel", { replace: true });
    } catch (submissionError) {
      setError(
        extractApiError(submissionError, "Nao foi possivel concluir a operacao."),
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="card-surface w-full rounded-[30px] p-8 md:p-10">
      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
          {mode === "login" ? "Login" : "Cadastro"}
        </p>
        <h1 className="section-title text-3xl font-semibold text-foreground">
          {mode === "login" ? "Entrar na plataforma" : "Cadastrar novo usuario"}
        </h1>
        <p className="text-sm leading-7 text-muted">
          {mode === "login"
            ? "Use seu e-mail e senha para acessar a area autenticada."
            : "Crie um usuario e relacione o perfil de acesso disponivel no backend."}
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">Nome</span>
            <input name="name" placeholder="Nome do usuario" required />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">E-mail</span>
          <input
            name="email"
            type="email"
            placeholder="voce@dominio.com"
            required
          />
        </label>

        {mode === "register" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Perfil de acesso
            </span>
            <select name="access_profile_id" defaultValue="">
              <option value="">Perfil padrao automatico</option>
              {accessProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Senha</span>
          <input
            name="password"
            type="password"
            placeholder="Digite sua senha"
            required
          />
        </label>

        {mode === "register" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-foreground">
              Confirmacao de senha
            </span>
            <input
              name="password_confirmation"
              type="password"
              placeholder="Repita sua senha"
              required
            />
          </label>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending
            ? "Processando..."
            : mode === "login"
              ? "Entrar"
              : "Criar conta"}
        </button>
      </form>

      <div className="mt-6 text-sm text-muted">
        {mode === "login" ? "Ainda nao tem acesso?" : "Ja possui uma conta?"}{" "}
        <Link
          to={mode === "login" ? "/cadastro" : "/login"}
          className="font-semibold text-primary"
        >
          {mode === "login" ? "Cadastrar usuario" : "Fazer login"}
        </Link>
      </div>
    </div>
  );
}
