import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, FileText, CheckCircle, Clock, Building, Download, MessageCircle } from "lucide-react";
import { formatCNPJ, formatDate, generateWhatsAppMessage } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import WhatsAppMessage from "@/components/whatsapp-message";
import type { User, Lead, Proposal } from "@shared/schema";

export default function ConsultantDashboard() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== "consultant") {
        setLocation("/admin/login");
        return;
      }
      setCurrentUser(user);
    } else {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  // Queries
  const { data: myLeads = [], refetch: refetchMyLeads } = useQuery<Lead[]>({
    queryKey: [`/api/leads/consultant/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const { data: myProposals = [] } = useQuery<Proposal[]>({
    queryKey: [`/api/proposals/consultant/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  // Pagination for proposals
  const [proposalsPage, setProposalsPage] = useState(1);
  const proposalsPerPage = 5;

  // Sort proposals by date (most recent first)
  const sortedMyProposals = [...myProposals].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  // Paginated proposals
  const proposalsTotalPages = Math.ceil(sortedMyProposals.length / proposalsPerPage);
  const proposalsStartIndex = (proposalsPage - 1) * proposalsPerPage;
  const paginatedMyProposals = sortedMyProposals.slice(proposalsStartIndex, proposalsStartIndex + proposalsPerPage);

  // Poll for new assignments every 5 seconds
  useEffect(() => {
    if (currentUser?.id) {
      const interval = setInterval(() => {
        refetchMyLeads();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentUser?.id, refetchMyLeads]);

  // Modal states
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [proposalForm, setProposalForm] = useState({
    pixRate: "0.00",
    debitRate: "0.51",
    creditRate: "1.01",
    credit12xRate: "1.29",
    anticipationRate: "1.03",
  });
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [showWhatsappMessage, setShowWhatsappMessage] = useState(false);

  // Lead creation
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const [createLeadForm, setCreateLeadForm] = useState({
    cnpj: "",
    companyName: "",
    phone: "",
  });
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);

  const { toast } = useToast();

  // Mutations
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/leads/${leadId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status da ficha foi atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/consultant/${currentUser?.id}`] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao atualizar o status da ficha.",
        variant: "destructive",
      });
    },
  });
  const createProposalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/proposals", data);
      return response.json();
    },
    onSuccess: (proposal) => {
      toast({
        title: "Proposta criada com sucesso",
        description: `Proposta para ${selectedLead?.companyName} foi criada.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/proposals/consultant/${currentUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/consultant/${currentUser?.id}`] });

      // Auto-open PDF
      window.open(`/api/proposals/${proposal.id}/pdf`, '_blank');

      // Reset form and close modal
      setIsProposalModalOpen(false);
      setSelectedLead(null);
      setProposalForm({
        pixRate: "0.00",
        debitRate: "0.51",
        creditRate: "1.01",
        credit12xRate: "1.29",
        anticipationRate: "1.03",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar proposta",
        description: "Ocorreu um erro ao criar a proposta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const generateWhatsappMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/whatsapp-message", data);
      return response.json();
    },
    onSuccess: (data) => {
      setWhatsappMessage(data.message);
      setShowWhatsappMessage(true);
    },
  });

  const cnpjAutofillMutation = useMutation({
    mutationFn: async (cnpj: string) => {
      const response = await apiRequest("POST", "/api/cnpj-autofill", { cnpj });
      const data = await response.json();

      if (data && data.company) {
        setCreateLeadForm(prev => ({
          ...prev,
          companyName: data.company.name,
        }));
        toast({
          title: "Dados preenchidos automaticamente",
          description: `Empresa: ${data.company.name}`,
        });
      }

      return data;
    },
    onError: () => {
      toast({
        title: "Erro ao buscar CNPJ",
        description: "Ocorreu um erro ao buscar informações do CNPJ. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/cnpj-lookup", {
        cnpj: data.cnpj,
        phone: data.phone
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ficha criada com sucesso",
        description: "A ficha foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/leads/consultant/${currentUser?.id}`] });
      setIsCreateLeadModalOpen(false);
      setCreateLeadForm({ cnpj: "", companyName: "", phone: "" });
    },
    onError: () => {
      toast({
        title: "Erro ao criar ficha",
        description: "Ocorreu um erro ao criar a ficha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setLocation("/");
  };

  const handleCreateProposal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsProposalModalOpen(true);
  };

  const handleSubmitProposal = () => {
    if (!selectedLead || !currentUser) return;

    const proposalData = {
      cnpj: selectedLead.cnpj,
      companyName: selectedLead.companyName,
      companySize: "Micro Empresa", // Default size
      consultantId: currentUser.id,
      consultantName: currentUser.name,
      phone: selectedLead.phone,
      pixRate: proposalForm.pixRate,
      debitRate: proposalForm.debitRate,
      creditRate: proposalForm.creditRate,
      credit12xRate: proposalForm.credit12xRate,
      anticipationRate: proposalForm.anticipationRate,
    };

    createProposalMutation.mutate(proposalData);
  };

  const handleGenerateWhatsapp = () => {
    if (!selectedLead || !currentUser) return;

    const data = {
      companyName: selectedLead.companyName,
      cnpj: selectedLead.cnpj,
      companySize: "Micro Empresa",
      consultantName: currentUser.name,
      pixRate: proposalForm.pixRate,
      debitRate: proposalForm.debitRate,
      creditRate: proposalForm.creditRate,
      credit12xRate: proposalForm.credit12xRate,
      anticipationRate: proposalForm.anticipationRate,
    };

    generateWhatsappMutation.mutate(data);
  };

  const handleCreateLeadCNPJChange = async (value: string) => {
    const formatted = formatCNPJ(value);
    setCreateLeadForm(prev => ({ ...prev, cnpj: formatted }));

    // Auto-fill when CNPJ is complete (18 characters including formatting)
    if (formatted.length === 18) {
      setIsLoadingCnpj(true);
      try {
        await cnpjAutofillMutation.mutateAsync(formatted);
      } finally {
        setIsLoadingCnpj(false);
      }
    }
  };

  const handleCreateLead = () => {
    if (!createLeadForm.cnpj || !createLeadForm.companyName) {
      toast({
        title: "Dados incompletos",
        description: "Preencha o CNPJ e aguarde o preenchimento automático dos dados.",
        variant: "destructive",
      });
      return;
    }

    createLeadMutation.mutate({
      cnpj: createLeadForm.cnpj,
      phone: createLeadForm.phone,
    });
  };

  if (!currentUser) {
    return null;
  }

  const stats = {
    assignedLeads: myLeads.length,
    proposalsCreated: myProposals.length,
    pendingLeads: myLeads.filter(lead => lead.status === 'assigned').length,
    completedLeads: myLeads.filter(lead => lead.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
                C
              </div>
              <h1 className="text-xl font-bold text-gray-900">Painel do Consultor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Consultor: <span className="font-medium">{currentUser.name}</span>
              </span>
              <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-800">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Fichas Atribuídas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.assignedLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Propostas Criadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.proposalsCreated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Finalizadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Minhas Fichas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Empresa</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">CNPJ</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">{lead.companyName}</td>
                        <td className="py-3 px-4 font-mono text-sm">{formatCNPJ(lead.cnpj)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {lead.createdAt ? formatDate(lead.createdAt) : ''}
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={lead.status === 'converted' || lead.status === 'completed' ? 'default' : 'secondary'}
                            className={
                              lead.status === 'assigned' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : lead.status === 'converted'
                                ? 'bg-green-100 text-green-800'
                                : lead.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {lead.status === 'assigned' ? 'Pendente' : 
                             lead.status === 'converted' ? 'Convertido' : 
                             lead.status === 'completed' ? 'Finalizado' : lead.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {lead.status === 'assigned' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleCreateProposal(lead)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Criar Proposta
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateLeadStatusMutation.mutate({ leadId: lead.id, status: 'completed' })}
                                  disabled={updateLeadStatusMutation.isPending}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  Finalizar
                                </Button>
                              </>
                            )}
                            {lead.status === 'completed' && (
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => updateLeadStatusMutation.mutate({ leadId: lead.id, status: 'assigned' })}
                                disabled={updateLeadStatusMutation.isPending}
                                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                              >
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ficha atribuída</h3>
                <p className="text-gray-600">
                  Você não possui fichas atribuídas no momento. 
                  Entre em contato com o administrador para receber leads.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        {myProposals.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Propostas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paginatedMyProposals.map((proposal) => (
                  <div key={proposal.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{proposal.companyName}</p>
                      <p className="text-sm text-gray-600">{formatCNPJ(proposal.cnpj)}</p>
                    </div>
                    <div className="text-right">
                      <Badge>{proposal.status}</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {proposal.createdAt ? formatDate(proposal.createdAt) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination for proposals */}
              {proposalsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    Mostrando {proposalsStartIndex + 1} a {Math.min(proposalsStartIndex + proposalsPerPage, sortedMyProposals.length)} de {sortedMyProposals.length} propostas
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProposalsPage(Math.max(1, proposalsPage - 1))}
                      disabled={proposalsPage === 1}
                    >
                      Anterior
                    </Button>
                    <div className="flex gap-1">
                      {[...Array(proposalsTotalPages)].map((_, index) => {
                        const page = index + 1;
                        return (
                          <Button
                            key={page}
                            variant={proposalsPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setProposalsPage(page)}
                            className="w-8"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProposalsPage(Math.min(proposalsTotalPages, proposalsPage + 1))}
                      disabled={proposalsPage === proposalsTotalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      {/* New Lead Creation Button */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Button onClick={() => setIsCreateLeadModalOpen(true)}>Criar Nova Ficha</Button>
      </div>

      {/* Proposal Creation Modal */}
      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Proposta - {selectedLead?.companyName}</DialogTitle>
          </DialogHeader>

          {/* Company Info Display */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Informações da Empresa</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">CNPJ:</span>
                <p className="font-mono">{formatCNPJ(selectedLead?.cnpj || '')}</p>
              </div>
              <div>
                <span className="text-gray-600">Telefone:</span>
                <p>{selectedLead?.phone || 'Não informado'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pixRate">Taxa PIX (%)</Label>
              <Input
                id="pixRate"
                type="number"
                step="0.01"
                value={proposalForm.pixRate}
                onChange={(e) => setProposalForm(prev => ({...prev, pixRate: e.target.value}))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debitRate">Taxa Débito (%)</Label>
              <Input
                id="debitRate"
                type="number"
                step="0.01"
                value={proposalForm.debitRate}
                onChange={(e) => setProposalForm(prev => ({...prev, debitRate: e.target.value}))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditRate">Taxa Crédito à Vista (%)</Label>
              <Input
                id="creditRate"
                type="number"
                step="0.01"
                value={proposalForm.creditRate}
                onChange={(e) => setProposalForm(prev => ({...prev, creditRate: e.target.value}))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit12xRate">Taxa Crédito 12x (%)</Label>
              <Input
                id="credit12xRate"
                type="number"
                step="0.01"
                value={proposalForm.credit12xRate}
                onChange={(e) => setProposalForm(prev => ({...prev, credit12xRate: e.target.value}))}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="anticipationRate">Taxa Antecipação (%)</Label>
              <Input
                id="anticipationRate"
                type="number"
                step="0.01"
                value={proposalForm.anticipationRate}
                onChange={(e) => setProposalForm(prev => ({...prev, anticipationRate: e.target.value}))}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsProposalModalOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              variant="outline"
              onClick={handleGenerateWhatsapp}
              disabled={generateWhatsappMutation.isPending}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Gerar WhatsApp
            </Button>

            <Button
              onClick={handleSubmitProposal}
              disabled={createProposalMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Criar Proposta + PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
       {/* Lead Creation Modal */}
       <Dialog open={isCreateLeadModalOpen} onOpenChange={setIsCreateLeadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Ficha</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="CNPJ da empresa"
                value={createLeadForm.cnpj}
                onChange={(e) => handleCreateLeadCNPJChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                placeholder="Nome da empresa"
                value={createLeadForm.companyName}
                onChange={(e) => setCreateLeadForm(prev => ({ ...prev, companyName: e.target.value }))}
                disabled={isLoadingCnpj}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="Telefone da empresa"
                value={createLeadForm.phone}
                onChange={(e) => setCreateLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isLoadingCnpj}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="ghost" onClick={() => setIsCreateLeadModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateLead} disabled={createLeadMutation.isPending || isLoadingCnpj}>
              Criar Ficha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Message Modal */}
      <Dialog open={showWhatsappMessage} onOpenChange={setShowWhatsappMessage}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mensagem WhatsApp</DialogTitle>
          </DialogHeader>

          <WhatsAppMessage
            message={whatsappMessage}
            onCopy={() => {
              navigator.clipboard.writeText(whatsappMessage);
              toast({
                title: "Mensagem copiada",
                description: "A mensagem foi copiada para a área de transferência.",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}