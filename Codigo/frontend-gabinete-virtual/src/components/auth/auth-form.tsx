import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  API_BASE_URL,
  extractApiError,
  getAccessProfiles,
  parseAuthResponse,
  storeToken,
} from "../../lib/auth";
import { Alert, Button, Card, Input, Select } from "../core";
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
    <Card className="w-full" padding="lg">
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
          <Input
            name="name"
            label="Nome"
            placeholder="Nome do usuario"
            required
          />
        ) : null}

        <Input
          name="email"
          type="email"
          label="E-mail"
          placeholder="voce@dominio.com"
          required
        />

        {mode === "register" ? (
          <Select
            name="access_profile_id"
            label="Perfil de acesso"
            defaultValue=""
            options={[
              {
                value: "",
                label: "Perfil padrao automatico",
              },
              ...accessProfiles.map((profile) => ({
                value: profile.id,
                label: profile.name,
              })),
            ]}
          />
        ) : null}

        <Input
          name="password"
          type="password"
          label="Senha"
          placeholder="Digite sua senha"
          required
        />

        {mode === "register" ? (
          <Input
            name="password_confirmation"
            type="password"
            label="Confirmacao de senha"
            placeholder="Repita sua senha"
            required
          />
        ) : null}

        {error ? (
          <Alert tone="danger">
            {error}
          </Alert>
        ) : null}

        <Button
          type="submit"
          block
          size="lg"
          isLoading={isPending}
          loadingText="Processando..."
        >
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
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
    </Card>
  );
}
