import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "./useAuth";
import { MentalLogo } from "@/components/layout/MentalLogo";

const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(values: LoginForm) {
    setFormError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setFormError(error);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-bg px-6 py-12 sm:justify-center">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 flex flex-col items-start gap-6 text-left">
          <MentalLogo />
          <div>
            <h1 className="text-xl font-semibold text-text">Command Center</h1>
            <p className="mt-1 text-sm text-text-muted">
              Acesse com seu e-mail e senha cadastrados.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-5 text-left"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-text-muted">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-text focus-visible:border-text"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="mt-1.5 text-sm text-danger">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-text-muted">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-text focus-visible:border-text"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
