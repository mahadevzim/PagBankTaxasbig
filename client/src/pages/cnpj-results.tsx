import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building, Calendar, FileText, Info, CreditCard, Smartphone } from "lucide-react";
import { formatCNPJ, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Company, Proposal } from "@shared/schema";
import logoPagBank from "@assets/Logo_PagBank.png";

export default function CNPJResults() {
  const { cnpj } = useParams();
  const [, setLocation] = useLocation();

  const { data: company, isLoading, error } = useQuery<Company>({
    queryKey: [`/api/cnpj/${cnpj}`],
    enabled: !!cnpj,
  });

  // Buscar taxas padrão configuradas no sistema
  const { data: defaultRates } = useQuery({
    queryKey: ["/api/settings/default-rates"],
  });;

  // Usar taxas padrão configuradas no sistema
  const rates = defaultRates || {
    pixRate: "0.00",
    debitRate: "0.51",
    creditRate: "1.01",
    credit12xRate: "1.29",
    anticipationRate: "2.49",
  };

  const handleNewSearch = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
            </CardHeader>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-40" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Erro na Consulta
                </CardTitle>
                <Button 
                  variant="outline"
                  onClick={handleNewSearch}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Nova Consulta
                </Button>
              </div>
            </CardHeader>
          </Card>
          
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível encontrar informações para o CNPJ {formatCNPJ(cnpj || '')}. 
              Verifique se o número está correto e tente novamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 fade-in">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Building className="h-6 w-6" />
                Dados da Empresa
              </CardTitle>
              <Button 
                variant="outline"
                onClick={handleNewSearch}
                className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Nova Consulta
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Company Data */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações Básicas
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Razão Social</label>
                    <p className="text-gray-900 font-medium text-lg">{company.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">CNPJ</label>
                    <p className="text-gray-900 font-mono text-lg">{formatCNPJ(company.cnpj)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant={company.status?.toLowerCase() === 'ativa' ? 'default' : 'secondary'}
                        className="bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        {company.status || 'Ativa'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Detalhes
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Porte</label>
                    <p className="text-gray-900 font-medium">{company.size || 'Micro Empresa'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Atividade Principal</label>
                    <p className="text-gray-900">{company.activity || 'Não informado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Data de Abertura
                    </label>
                    <p className="text-gray-900">{company.openDate || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* PagBank Rates Table */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <img src={logoPagBank} alt="PagBank" className="h-8" />
                Taxas PagBank
              </CardTitle>
              <Badge className="bg-green-100 text-green-800 px-3 py-1">
                Taxas Atualizadas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Modalidade de Pagamento</TableHead>
                    <TableHead className="text-center">Taxa (%)</TableHead>
                    <TableHead className="text-center">Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="flex items-center gap-3 font-medium">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      PIX
                    </TableCell>
                    <TableCell className="text-center font-bold text-green-600">
                      {rates.pixRate}%
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      Transferência instantânea
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="flex items-center gap-3 font-medium">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      Cartão de Débito
                    </TableCell>
                    <TableCell className="text-center font-bold text-blue-600">
                      {rates.debitRate}%
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      Débito à vista
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="flex items-center gap-3 font-medium">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      Cartão de Crédito à Vista
                    </TableCell>
                    <TableCell className="text-center font-bold text-purple-600">
                      {rates.creditRate}%
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      Crédito à vista
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="flex items-center gap-3 font-medium">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                      Cartão de Crédito 12x
                    </TableCell>
                    <TableCell className="text-center font-bold text-orange-600">
                      {rates.credit12xRate}%
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      Parcelado em 12 vezes
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell className="flex items-center gap-3 font-medium">
                      <CreditCard className="h-5 w-5 text-red-600" />
                      Antecipação de Recebíveis
                    </TableCell>
                    <TableCell className="text-center font-bold text-red-600">
                      {rates.anticipationRate}%
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      Antecipação do valor
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Information Alert */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Alert className="bg-green-50 border-green-200">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Empresa consultada com sucesso!</strong> As taxas acima são nossas condições especiais para sua empresa. 
                  Nossa equipe entrará em contato em breve para apresentar uma proposta personalizada.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
