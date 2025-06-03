import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { formatCNPJ, validateCNPJ } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import pagbankLogo from "@assets/Logo_PagBank.png";
import outraLogo from "@assets/outra.png";

export default function ClientLanding() {
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const cnpjMutation = useMutation({
    mutationFn: async (data: { cnpj: string; phone: string }) => {
      const response = await apiRequest("POST", "/api/cnpj-lookup", data);
      return response.json();
    },
    onSuccess: (company) => {
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      setLocation(`/cnpj/${cleanCNPJ}`);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao consultar CNPJ. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      let formatted = numbers;
      formatted = formatted.replace(/^(\d{2})(\d)/, '($1) $2');
      formatted = formatted.replace(/(\d{5})(\d)/, '$1-$2');
      return formatted;
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCNPJ(cnpj)) {
      toast({
        title: "CNPJ Inválido",
        description: "Por favor, digite um CNPJ válido.",
        variant: "destructive",
      });
      return;
    }

    cnpjMutation.mutate({ cnpj, phone });
  };

  const handleAdminAccess = () => {
    setLocation("/admin/login");
  };

  return (
    <div className="min-h-screen pagbank-gradient flex flex-col">
      {/* Header with PagBank Logo */}
      <header className="w-full p-6">
        <div className="max-w-4xl mx-auto flex justify-center items-center">
          <div className="bg-white p-4 rounded-xl shadow-lg">
            <img 
              src={pagbankLogo} 
              alt="PagBank Logo" 
              className="h-16 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full fade-in">
          <Card className="shadow-2xl">
            <CardContent className="p-8">
              {/* Promotional Image */}
              <div className="text-center mb-6">
                <img 
                  src={outraLogo} 
                  alt="Promoção PagBank" 
                  className="w-full max-w-xs mx-auto rounded-lg"
                />
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Redução de Taxas
                </h1>
                <p className="text-gray-600 text-lg">
                  Digite o CNPJ da empresa para consultar informações sobre as propostas disponiveis pra você
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="cnpj" className="text-sm font-medium text-gray-700">
                    CNPJ
                  </Label>
                  <Input
                    id="cnpj"
                    type="text"
                    value={cnpj}
                    onChange={handleCNPJChange}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    required
                    className="mt-2 text-lg font-mono"
                    disabled={cnpjMutation.isPending}
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Telefone (Opcional)
                  </Label>
                  <Input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    className="mt-2 text-lg font-mono"
                    disabled={cnpjMutation.isPending}
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
                  disabled={cnpjMutation.isPending}
                >
                  {cnpjMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Consultando dados...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Consultar CNPJ
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

         
        </div>
      </main>
    </div>
  );
}
