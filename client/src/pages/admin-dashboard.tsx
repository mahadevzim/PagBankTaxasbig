import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, FileText, Users, UserCheck, Plus, Edit, Trash2, Download, Copy, X, Phone, Building, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCNPJ, generateWhatsAppMessage } from "@/lib/utils";
import WhatsAppMessage from "@/components/whatsapp-message";
import type { User, Lead, Proposal } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [proposalForm, setProposalForm] = useState({
    cnpj: "",
    companyName: "",
    consultantId: "",
    consultantName: "",
    pixRate: "0.00",
    debitRate: "0.51",
    creditRate: "1.01",
    credit12xRate: "1.29",
    anticipationRate: "1.03",
  });

  const [defaultRatesForm, setDefaultRatesForm] = useState({
    pixRate: "0.00",
    debitRate: "0.51",
    creditRate: "1.01",
    credit12xRate: "1.29",
    anticipationRate: "1.03",
  });

  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);

  const [newConsultant, setNewConsultant] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    consultantId: "",
    notes: "",
    selectedLeads: [] as number[],
  });

  // Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [proposalModalForm, setProposalModalForm] = useState({
    consultantId: "",
    consultantName: "",
    pixRate: "0.00",
    debitRate: "0.51",
    creditRate: "1.01",
    credit12xRate: "1.29",
    anticipationRate: "1.03",
  });

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role !== "admin") {
        setLocation("/admin/login");
        return;
      }
      setCurrentUser(user);
    } else {
      setLocation("/admin/login");
    }
  }, [setLocation]);

  // Queries
  const { data: consultants = [] } = useQuery<User[]>({
    queryKey: ["/api/users/consultants"],
  });

  const { data: pendingLeads = [], refetch: refetchLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads/pending"],
  });

  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads/all"],
  });

  const { data: proposals = [] } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: defaultRates } = useQuery({
    queryKey: ["/api/settings/default-rates"],
  });

  // Update form when default rates are loaded
  useEffect(() => {
    if (defaultRates) {
      setDefaultRatesForm(defaultRates);
    }
  }, [defaultRates]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sort proposals by date (most recent first)
  const sortedProposals = [...proposals].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  // Paginated proposals
  const totalPages = Math.ceil(sortedProposals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProposals = sortedProposals.slice(startIndex, startIndex + itemsPerPage);

  // Monitor for new leads
  useEffect(() => {
    const interval = setInterval(() => {
      refetchLeads();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [refetchLeads]);

  // Auto-open modal for new leads
  useEffect(() => {
    if (pendingLeads.length > 0) {
      const latestLead = pendingLeads.sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];

      // Check if this is a new lead (created in the last 30 seconds)
      const isNewLead = latestLead.createdAt && 
        new Date().getTime() - new Date(latestLead.createdAt).getTime() < 30000;

      if (isNewLead && !selectedLead) {
        setSelectedLead(latestLead);
        setIsLeadModalOpen(true);
      }
    }
  }, [pendingLeads, selectedLead]);

  // Mutations
  const createProposalMutation = useMutation({
    mutationFn: async (data: typeof proposalForm) => {
      const response = await apiRequest("POST", "/api/proposals", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Proposta criada com sucesso",
        description: "A proposta foi salva e está disponível para download.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      resetProposalForm();
    },
  });

  const createConsultantMutation = useMutation({
    mutationFn: async (data: typeof newConsultant) => {
      const response = await apiRequest("POST", "/api/users", {
        ...data,
        role: "consultant",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultor criado com sucesso",
        description: "O novo consultor foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/consultants"] });
      setNewConsultant({ username: "", password: "", name: "", email: "" });
    },
  });

  const deleteConsultantMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultor removido",
        description: "O consultor foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/consultants"] });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/proposals/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Proposta excluída",
        description: "A proposta foi removida do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
  });

  const deleteAllProposalsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/proposals");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Todas as propostas excluídas",
        description: "Todas as propostas foram removidas do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
    },
  });

  const assignLeadsMutation = useMutation({
    mutationFn: async (data: { leadId: number; consultantId: number }) => {
      const response = await apiRequest("PUT", `/api/leads/${data.leadId}/assign`, {
        consultantId: data.consultantId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fichas atribuídas com sucesso",
        description: "As fichas foram enviadas para o consultor selecionado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/pending"] });
      setAssignmentForm({ consultantId: "", notes: "", selectedLeads: [] });
    },
  });
const toggleSelectAllLeads = () => {
  if (assignmentForm.selectedLeads.length === pendingLeads.length) {
    // Se todas já estão selecionadas, deseleciona todas
    setAssignmentForm(prev => ({ ...prev, selectedLeads: [] }));
  } else {
    // Seleciona todas as fichas pendentes
    setAssignmentForm(prev => ({
      ...prev,
      selectedLeads: pendingLeads.map(lead => lead.id)
    }));
  }
};
  const whatsappMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/whatsapp-message", data);
      return response.json();
    },
  });

  const createProposalFromModalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/proposals", data);
      return response.json();
    },
    onSuccess: (proposal) => {
      toast({
        title: "Proposta criada com sucesso",
        description: "Clique em 'Ver PDF' para visualizar ou imprimir a proposta.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/pending"] });

      // Abrir PDF em nova aba
      const pdfUrl = `/api/proposals/${proposal.id}/pdf`;
      window.open(pdfUrl, '_blank');

      setIsLeadModalOpen(false);
      setSelectedLead(null);
    },
  });

  const copyAllProposalsMutation = useMutation({
    mutationFn: async () => {
      const proposalsText = sortedProposals.map(proposal => 
        `Empresa: ${proposal.companyName}\nCNPJ: ${proposal.cnpj}\nConsultor: ${proposal.consultantName}\nData: ${proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('pt-BR') : ''}\nTaxas: PIX ${proposal.pixRate}%, Débito ${proposal.debitRate}%, Crédito ${proposal.creditRate}%, 12x ${proposal.credit12xRate}%, Antecipação ${proposal.anticipationRate}%\n---`
      ).join('\n\n');

      await navigator.clipboard.writeText(proposalsText);
      return proposalsText;
    },
    onSuccess: () => {
      toast({
        title: "Propostas copiadas",
        description: "Todas as propostas foram copiadas para a área de transferência.",
      });
    },
  });

  const updateDefaultRatesMutation = useMutation({
    mutationFn: async (data: typeof defaultRatesForm) => {
      const response = await apiRequest("POST", "/api/settings/default-rates", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Taxas padrão atualizadas",
        description: "As taxas padrão foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/default-rates"] });
    },
  });

  const cnpjAutofillMutation = useMutation({
    mutationFn: async (cnpj: string) => {
      const response = await apiRequest("POST", "/api/cnpj-autofill", { cnpj });
      return response.json();
    },
    onSuccess: (data) => {
      setProposalForm(prev => ({
        ...prev,
        companyName: data.company.name,
        pixRate: data.defaultRates.pixRate,
        debitRate: data.defaultRates.debitRate,
        creditRate: data.defaultRates.creditRate,
        credit12xRate: data.defaultRates.credit12xRate,
        anticipationRate: data.defaultRates.anticipationRate,
      }));
      toast({
        title: "Dados preenchidos automaticamente",
        description: `Empresa: ${data.company.name}`,
      });
    },
    onError: () => {
      toast({
        title: "Erro ao buscar CNPJ",
        description: "Não foi possível encontrar os dados da empresa.",
        variant: "destructive",
      });
    },
  });

  const resetProposalForm = () => {
    setProposalForm({
      cnpj: "",
      companyName: "",
      consultantId: "",
      consultantName: "",
      pixRate: defaultRates?.pixRate || "0.00",
      debitRate: defaultRates?.debitRate || "0.51",
      creditRate: defaultRates?.creditRate || "1.01",
      credit12xRate: defaultRates?.credit12xRate || "1.29",
      anticipationRate: defaultRates?.anticipationRate || "2.49",
    });
  };

  const handleSaveDefaultRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateDefaultRatesMutation.mutate(defaultRatesForm);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setLocation("/");
  };

  const handleCNPJChange = async (value: string) => {
    const formatted = formatCNPJ(value);
    setProposalForm(prev => ({ ...prev, cnpj: formatted }));

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

  const handleConsultantSelect = (consultantId: string) => {
    const consultant = consultants.find(c => c.id.toString() === consultantId);
    setProposalForm(prev => ({ 
      ...prev, 
      consultantId,
      consultantName: consultant?.name || ""
    }));
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    createProposalMutation.mutate(proposalForm);
  };

  const handleCreateConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    createConsultantMutation.mutate(newConsultant);
  };

  const handleDeleteConsultant = (id: number) => {
    if (confirm("Tem certeza que deseja remover este consultor?")) {
      deleteConsultantMutation.mutate(id);
    }
  };

  const handleLeadSelection = (leadId: number) => {
    setAssignmentForm(prev => ({
      ...prev,
      selectedLeads: prev.selectedLeads.includes(leadId)
        ? prev.selectedLeads.filter(id => id !== leadId)
        : [...prev.selectedLeads, leadId]
    }));
  };

  const handleAssignLeads = () => {
    if (!assignmentForm.consultantId || assignmentForm.selectedLeads.length === 0) {
      toast({
        title: "Seleção inválida",
        description: "Selecione um consultor e pelo menos uma ficha.",
        variant: "destructive",
      });
      return;
    }

    assignmentForm.selectedLeads.forEach(leadId => {
      assignLeadsMutation.mutate({
        leadId,
        consultantId: parseInt(assignmentForm.consultantId),
      });
    });
  };

  const generateWhatsApp = () => {
    if (!proposalForm.companyName || !proposalForm.cnpj || !proposalForm.consultantName) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos da proposta antes de gerar a mensagem.",
        variant: "destructive",
      });
      return;
    }

    whatsappMutation.mutate({
        companyName: proposalForm.companyName,
        cnpj: proposalForm.cnpj,
        companySize: "Micro Empresa",
        consultantName: proposalForm.consultantName,
        pixRate: proposalForm.pixRate,
        debitRate: proposalForm.debitRate,
        creditRate: proposalForm.creditRate,
        credit12xRate: proposalForm.credit12xRate,
        anticipationRate: proposalForm.anticipationRate,
      });
  };

  const handleModalConsultantSelect = (consultantId: string) => {
    const consultant = consultants.find(c => c.id.toString() === consultantId);
    setProposalModalForm(prev => ({ 
      ...prev, 
      consultantId,
      consultantName: consultant?.name || ""
    }));
  };

  const handleCreateProposalFromModal = () => {
    if (!selectedLead || !proposalModalForm.consultantId) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um consultor para criar a proposta.",
        variant: "destructive",
      });
      return;
    }

    createProposalFromModalMutation.mutate({
      cnpj: selectedLead.cnpj,
      companyName: selectedLead.companyName,
      consultantId: parseInt(proposalModalForm.consultantId),
      consultantName: proposalModalForm.consultantName,
      pixRate: proposalModalForm.pixRate,
      debitRate: proposalModalForm.debitRate,
      creditRate: proposalModalForm.creditRate,
      credit12xRate: proposalModalForm.credit12xRate,
      anticipationRate: proposalModalForm.anticipationRate,
    });
  };

  const generateModalWhatsApp = () => {
    if (!selectedLead || !proposalModalForm.consultantName) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos antes de gerar a mensagem.",
        variant: "destructive",
      });
      return;
    }

    whatsappMutation.mutate({
        companyName: selectedLead.companyName,
        cnpj: selectedLead.cnpj,
        companySize: "Micro Empresa",
        consultantName: proposalModalForm.consultantName,
        pixRate: proposalModalForm.pixRate,
        debitRate: proposalModalForm.debitRate,
        creditRate: proposalModalForm.creditRate,
        credit12xRate: proposalModalForm.credit12xRate,
        anticipationRate: proposalModalForm.anticipationRate,
      });
  };

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadModalOpen(true);
    setProposalModalForm({
      consultantId: "",
      consultantName: "",
      pixRate: "0.00",
      debitRate: "0.51",
      creditRate: "1.01",
      credit12xRate: "1.29",
      anticipationRate: "2.49",
    });
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white text-sm font-bold">
                P
              </div>
              <h1 className="text-xl font-bold text-gray-900">Painel Administrativo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Admin: <span className="font-medium">{currentUser.name}</span>
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
        <Tabs defaultValue="proposals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Propostas
            </TabsTrigger>
            <TabsTrigger value="consultants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Consultores
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Distribuir Fichas
            </TabsTrigger>
            <TabsTrigger value="consultant-leads" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Status das Fichas
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">

            {/* Received Proposals Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Propostas Recebidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLeads.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingLeads.map((lead) => (
                        <div key={lead.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium text-gray-900">{lead.companyName}</h3>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                Pendente
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{formatCNPJ(lead.cnpj)}</p>
                            {lead.phone && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Recebido em: {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </p>
                            <div className="pt-2">
                              <Button
                                size="sm"
                                onClick={() => openLeadModal(lead)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Criar Proposta
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma proposta recebida</h3>
                    <p className="text-gray-600">
                      As consultas de CNPJ realizadas pelos clientes aparecerão aqui.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Criar Nova Proposta</CardTitle>
                  <Button
                    onClick={generateWhatsApp}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={whatsappMutation.isPending}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateProposal} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Data */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Dados do Cliente</h3>

                    <div>
                      <Label>CNPJ</Label>
                      <div className="relative">
                        <Input
                          value={proposalForm.cnpj}
                          onChange={(e) => handleCNPJChange(e.target.value)}
                          placeholder="00.000.000/0000-00"
                          maxLength={18}
                          required
                          disabled={isLoadingCnpj}
                        />
                        {isLoadingCnpj && (
                          <div className="absolute right-3 top-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Razão Social</Label>
                      <Input
                        value={proposalForm.companyName}
                        onChange={(e) => setProposalForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Nome da empresa"
                        required
                      />
                    </div>

                    

                    <div>
                      <Label>Consultor Responsável</Label>
                      <Select
                        value={proposalForm.consultantId}
                        onValueChange={handleConsultantSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um consultor" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultants.map((consultant) => (
                            <SelectItem key={consultant.id} value={consultant.id.toString()}>
                              {consultant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Rates Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Configuração de Taxas</h3>

                    <div>
                      <Label>PIX (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={proposalForm.pixRate}
                        onChange={(e) => setProposalForm(prev => ({ ...prev, pixRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Cartão de Débito (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={proposalForm.debitRate}
                        onChange={(e) => setProposalForm(prev => ({ ...prev, debitRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Cartão de Crédito à Vista (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={proposalForm.creditRate}
                        onChange={(e) => setProposalForm(prev => ({ ...prev, creditRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Cartão de Crédito 12x (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={proposalForm.credit12xRate}
                        onChange={(e) => setProposalForm(prev => ({ ...prev, credit12xRate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Antecipação (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={proposalForm.anticipationRate}
                        onChange={(e) => setProposalForm(prev => ({ ...prev, anticipationRate: e.target.value }))}
                      />
                    </div>

                    <Button 
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={createProposalMutation.isPending}
                    >
                      Criar Proposta
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* WhatsApp Message Preview */}
            {whatsappMutation.data && (
              <WhatsAppMessage
                message={whatsappMutation.data.message}
                onCopy={() => {
                  navigator.clipboard.writeText(whatsappMutation.data.message);
                  toast({
                    title: "Mensagem copiada",
                    description: "A mensagem foi copiada para a área de transferência.",
                  });
                }}
              />
            )}

            {/* Created Proposals Section */}
            {proposals.length > 0 && (
              <>
                <Separator />
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Propostas Criadas ({proposals.length})
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyAllProposalsMutation.mutate()}
                          disabled={copyAllProposalsMutation.isPending}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar Todas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir TODAS as propostas? Esta ação não pode ser desfeita.')) {
                              deleteAllProposalsMutation.mutate();
                            }
                          }}
                          disabled={deleteAllProposalsMutation.isPending}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir Todas
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Empresa</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">CNPJ</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Consultor</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Taxas</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Data</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProposals.map((proposal) => (
                            <tr key={proposal.id} className="border-b border-gray-100">
                              <td className="py-3 px-4 font-medium">{proposal.companyName}</td>
                              <td className="py-3 px-4 font-mono text-sm">{formatCNPJ(proposal.cnpj)}</td>
                              <td className="py-3 px-4 text-sm">{proposal.consultantName}</td>
                              <td className="py-3 px-4 text-sm">
                                <div className="space-y-1">
                                  <div>PIX: {proposal.pixRate}%</div>
                                  <div>Débito: {proposal.debitRate}%</div>
                                  <div>Crédito: {proposal.creditRate}%</div>
                                  <div>12x: {proposal.credit12xRate}%</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={proposal.status === 'approved' ? 'default' : 'secondary'}
                                  className={
                                    proposal.status === 'draft' 
                                      ? 'bg-gray-100 text-gray-800' 
                                      : proposal.status === 'sent'
                                      ? 'bg-blue-100 text-blue-800'
                                      : proposal.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }
                                >
                                  {proposal.status === 'draft' ? 'Rascunho' : 
                                   proposal.status === 'sent' ? 'Enviada' :
                                   proposal.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('pt-BR') : ''}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/api/proposals/${proposal.id}/pdf`, '_blank')}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Ver PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm('Tem certeza que deseja excluir esta proposta?')) {
                                        deleteProposalMutation.mutate(proposal.id);
                                      }
                                    }}
                                    disabled={deleteProposalMutation.isPending}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-700">
                          Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedProposals.length)} de {sortedProposals.length} propostas
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Anterior
                          </Button>
                          <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, index) => {
                              const page = index + 1;
                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
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
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Consultants Tab */}
          <TabsContent value="consultants" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Gerenciar Consultores</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Consultant Form */}
                <form onSubmit={handleCreateConsultant} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={newConsultant.name}
                      onChange={(e) => setNewConsultant(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={newConsultant.email}
                      onChange={(e) => setNewConsultant(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Usuário</Label>
                    <Input
                      value={newConsultant.username}
                      onChange={(e) => setNewConsultant(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Login do usuário"
                      required
                    />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={newConsultant.password}
                      onChange={(e) => setNewConsultant(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Senha de acesso"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button 
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={createConsultantMutation.isPending}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Consultor
                    </Button>
                  </div>
                </form>

                <Separator />

                {/* Consultants List */}
                <div className="space-y-4">
                  {consultants.map((consultant) => (
                    <div key={consultant.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">{consultant.name}</h3>
                        <p className="text-sm text-gray-600">{consultant.email}</p>
                        <p className="text-sm text-gray-600">Login: {consultant.username}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteConsultant(consultant.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}

                  {consultants.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum consultor cadastrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuir Fichas para Consultores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Pending Leads */}
<div>
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-lg font-medium text-gray-900">
      Fichas Pendentes 
      {assignmentForm.selectedLeads.length > 0 && (
        <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
          {assignmentForm.selectedLeads.length} selecionada{assignmentForm.selectedLeads.length !== 1 ? 's' : ''}
        </span>
      )}
    </h3>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Select last 5 leads that are not already selected
          const unselectedLeads = pendingLeads.filter(lead => !assignmentForm.selectedLeads.includes(lead.id));
          const last5Leads = unselectedLeads.slice(-5).map(lead => lead.id);
          setAssignmentForm(prev => ({
            ...prev,
            selectedLeads: [...prev.selectedLeads, ...last5Leads]
          }));
        }}
        className="text-blue-600 border-blue-300 hover:bg-blue-50"
        disabled={pendingLeads.length === 0}
      >
        +5 Últimas
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSelectAllLeads}
        className="text-green-600 border-green-300 hover:bg-green-50"
      >
        {assignmentForm.selectedLeads.length === pendingLeads.length ? 
          "Deselecionar Todas" : "Selecionar Todas"}
      </Button>
    </div>
  </div>
  <div className="space-y-3 max-h-96 overflow-y-auto">
    {pendingLeads.map((lead) => (
      <div key={lead.id} className="border border-gray-200 rounded-lg p-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{lead.companyName}</p>
            <p className="text-sm text-gray-600">{formatCNPJ(lead.cnpj)}</p>
            {lead.phone && (
              <p className="text-sm text-gray-600">📞 {lead.phone}</p>
            )}
            <p className="text-xs text-gray-500">
              Consultado em: {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openLeadModal(lead)}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <FileText className="h-4 w-4 mr-1" />
              Proposta
            </Button>
            <input 
              type="checkbox"
              checked={assignmentForm.selectedLeads.includes(lead.id)}
              onChange={() => handleLeadSelection(lead.id)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    ))}

    {pendingLeads.length === 0 && (
      <div className="text-center py-8 text-gray-500">
        Nenhuma ficha pendente
      </div>
    )}
  </div>
</div>

                  {/* Assignment Form */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Atribuir a Consultor</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Consultor</Label>
                        <Select
                          value={assignmentForm.consultantId}
                          onValueChange={(value) => setAssignmentForm(prev => ({ ...prev, consultantId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um consultor" />
                          </SelectTrigger>
                          <SelectContent>
                            {consultants.map((consultant) => (
                              <SelectItem key={consultant.id} value={consultant.id.toString()}>
                                {consultant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Observações</Label>
                        <Textarea
                          value={assignmentForm.notes}
                          onChange={(e) => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Observações sobre o lead..."
                          rows={3}
                        />
                      </div>

                      <Button 
                        onClick={handleAssignLeads}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={assignLeadsMutation.isPending}
                      >
                        Atribuir Fichas Selecionadas
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consultant Leads Status Tab */}
          <TabsContent value="consultant-leads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status das Fichas por Consultor</CardTitle>
              </CardHeader>
              <CardContent>
                {consultants.length > 0 ? (
                  <div className="space-y-6">
                    {consultants.map((consultant) => {
                      const consultantLeads = allLeads.filter(lead => lead.consultantId === consultant.id);
                      const pendingCount = consultantLeads.filter(lead => lead.status === 'assigned').length;
                      const completedCount = consultantLeads.filter(lead => lead.status === 'completed').length;
                      const convertedCount = consultantLeads.filter(lead => lead.status === 'converted').length;

                      return (
                        <Card key={consultant.id} className="border-l-4 border-l-blue-500">
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">{consultant.name}</CardTitle>
                              <div className="flex gap-4">
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                  {pendingCount} Pendentes
                                </Badge>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  {completedCount} Finalizadas
                                </Badge>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  {convertedCount} Convertidas
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {consultantLeads.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Empresa</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">CNPJ</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Status</th>
                                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Data</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {consultantLeads.map((lead) => (
                                      <tr key={lead.id} className="border-b border-gray-100">
                                        <td className="py-2 px-3 text-sm">{lead.companyName}</td>
                                        <td className="py-2 px-3 text-sm font-mono">{formatCNPJ(lead.cnpj)}</td>
                                        <td className="py-2 px-3">
                                          <Badge 
                                            variant="secondary"
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
                                        <td className="py-2 px-3 text-sm text-gray-600">
                                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : ''}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">Nenhuma ficha atribuída</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum consultor cadastrado</h3>
                    <p className="text-gray-600">
                      Cadastre consultores para visualizar o status das fichas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Taxas Padrão</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveDefaultRates} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>PIX (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={defaultRatesForm.pixRate}
                        onChange={(e) => setDefaultRatesForm(prev => ({ ...prev, pixRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Cartão de Débito (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={defaultRatesForm.debitRate}
                        onChange={(e) => setDefaultRatesForm(prev => ({ ...prev, debitRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Cartão de Crédito à Vista (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={defaultRatesForm.creditRate}
                        onChange={(e) => setDefaultRatesForm(prev => ({ ...prev, creditRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Cartão de Crédito 12x (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={defaultRatesForm.credit12xRate}
                        onChange={(e) => setDefaultRatesForm(prev => ({ ...prev, credit12xRate: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Antecipação (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={defaultRatesForm.anticipationRate}
                        onChange={(e) => setDefaultRatesForm(prev => ({ ...prev, anticipationRate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={updateDefaultRatesMutation.isPending}
                    >
                      {updateDefaultRatesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Taxas Padrão'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Lead Proposal Modal */}
      <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              Nova Proposta Recebida
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Informações da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Razão Social</Label>
                    <p className="text-gray-900 font-medium">{selectedLead.companyName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">CNPJ</Label>
                    <p className="text-gray-900 font-mono">{formatCNPJ(selectedLead.cnpj)}</p>
                  </div>
                  {selectedLead.phone && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                      <p className="text-gray-900 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {selectedLead.phone}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Data da Consulta</Label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('pt-BR') : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Proposal Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configurar Proposta</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Consultant Selection */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Consultor Responsável</h3>
                    <div>
                      <Label>Consultor</Label>
                      <Select
                        value={proposalModalForm.consultantId}
                        onValueChange={handleModalConsultantSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um consultor" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultants.map((consultant) => (
                            <SelectItem key={consultant.id} value={consultant.id.toString()}>
                              {consultant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Rates Configuration */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Taxas Propostas</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>PIX (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={proposalModalForm.pixRate}
                          onChange={(e) => setProposalModalForm(prev => ({ ...prev, pixRate: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>Débito (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={proposalModalForm.debitRate}
                          onChange={(e) => setProposalModalForm(prev => ({ ...prev, debitRate: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>Crédito à Vista (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={proposalModalForm.creditRate}
                          onChange={(e) => setProposalModalForm(prev => ({ ...prev, creditRate: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>Crédito 12x (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={proposalModalForm.credit12xRate}
                          onChange={(e) => setProposalModalForm(prev => ({ ...prev, credit12xRate: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>Antecipação (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={proposalModalForm.anticipationRate}
                          onChange={(e) => setProposalModalForm(prev => ({ ...prev, anticipationRate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleCreateProposalFromModal}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={createProposalFromModalMutation.isPending || !proposalModalForm.consultantId}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Criar Proposta e Gerar PDF
                </Button>

                <Button 
                  onClick={generateModalWhatsApp}
                  variant="outline"
                  className="flex-1 border-green-300 text-green-600 hover:bg-green-50"
                  disabled={whatsappMutation.isPending || !proposalModalForm.consultantName}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Gerar Mensagem WhatsApp
                </Button>
              </div>

              {/* WhatsApp Message Preview */}
              {whatsappMutation.data && (
                <WhatsAppMessage
                  message={whatsappMutation.data.message}
                  onCopy={() => {
                    navigator.clipboard.writeText(whatsappMutation.data.message);
                    toast({
                      title: "Mensagem copiada",
                      description: "A mensagem foi copiada para a área de transferência.",
                    });
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}