import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface LoginResponse {
  user: User;
}

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState<"admin" | "consultant">("admin");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json() as Promise<LoginResponse>;
    },
    onSuccess: (data) => {
      const { user } = data;
      
      // Store user data in sessionStorage
      sessionStorage.setItem("user", JSON.stringify(user));
      
      // Redirect based on role
      if (user.role === "admin") {
        setLocation("/admin/dashboard");
      } else if (user.role === "consultant") {
        setLocation("/consultant/dashboard");
      }
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${user.name}!`,
      });
    },
    onError: () => {
      toast({
        title: "Erro no login",
        description: "Credenciais inválidas. Verifique seu usuário e senha.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen pagbank-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md fade-in">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Acesso ao Sistema
            </CardTitle>
            <p className="text-gray-600">
              Entre com suas credenciais para acessar o painel
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Login Type Selector */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={loginType === "admin" ? "default" : "outline"}
                className={`flex-1 ${loginType === "admin" ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={() => setLoginType("admin")}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
              <Button
                type="button"
                variant={loginType === "consultant" ? "default" : "outline"}
                className={`flex-1 ${loginType === "consultant" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                onClick={() => setLoginType("consultant")}
              >
                <Users className="h-4 w-4 mr-2" />
                Consultor
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  disabled={loginMutation.isPending}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  disabled={loginMutation.isPending}
                  className="mt-1"
                />
              </div>

              <Button 
                type="submit"
                className={`w-full ${
                  loginType === "admin" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  `Entrar como ${loginType === "admin" ? "Admin" : "Consultor"}`
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={handleBackToHome}
                className="w-full text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à página inicial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
