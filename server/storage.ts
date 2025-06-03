import { users, companies, proposals, leads, type User, type InsertUser, type Company, type InsertCompany, type Proposal, type InsertProposal, type Lead, type InsertLead } from "@shared/schema";
import { fileStorage } from "./file-storage";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllConsultants(): Promise<User[]>;

  // Companies
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByCnpj(cnpj: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;

  // Proposals
  getProposal(id: number): Promise<Proposal | undefined>;
  getProposalsByConsultant(consultantId: number): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  getAllProposals(): Promise<Proposal[]>;
  deleteProposal(id: number): Promise<boolean>;
  deleteAllProposals(): Promise<void>;

  // Leads
  getLead(id: number): Promise<Lead | undefined>;
  getLeadsByConsultant(consultantId: number): Promise<Lead[]>;
  getPendingLeads(): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  assignLeadToConsultant(leadId: number, consultantId: number): Promise<Lead | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private proposals: Map<number, Proposal>;
  private leads: Map<number, Lead>;
  private currentUserId: number;
  private currentCompanyId: number;
  private currentProposalId: number;
  private currentLeadId: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.proposals = new Map();
    this.leads = new Map();
    this.currentUserId = 1;
    this.currentCompanyId = 1;
    this.currentProposalId = 1;
    this.currentLeadId = 1;

    this.initializeData();
  }

  private async initializeData() {
    try {
      // Load users from file
      const userLines = await fileStorage.readFile('users.txt');
      userLines.forEach(line => {
        try {
          const user = JSON.parse(line) as User;
          this.users.set(user.id, user);
          this.currentUserId = Math.max(this.currentUserId, user.id + 1);
        } catch (e) {
          console.error('Error parsing user line:', line);
        }
      });

      // Load companies from file
      const companyLines = await fileStorage.readFile('companies.txt');
      companyLines.forEach(line => {
        try {
          const company = JSON.parse(line) as Company;
          this.companies.set(company.id, company);
          this.currentCompanyId = Math.max(this.currentCompanyId, company.id + 1);
        } catch (e) {
          console.error('Error parsing company line:', line);
        }
      });

      // Load proposals from file
      const proposalLines = await fileStorage.readFile('proposals.txt');
      proposalLines.forEach(line => {
        try {
          const proposal = JSON.parse(line) as Proposal;
          this.proposals.set(proposal.id, proposal);
          this.currentProposalId = Math.max(this.currentProposalId, proposal.id + 1);
        } catch (e) {
          console.error('Error parsing proposal line:', line);
        }
      });

      // Load leads from file
      const leadLines = await fileStorage.readFile('leads.txt');
      leadLines.forEach(line => {
        try {
          const lead = JSON.parse(line) as Lead;
          this.leads.set(lead.id, lead);
          this.currentLeadId = Math.max(this.currentLeadId, lead.id + 1);
        } catch (e) {
          console.error('Error parsing lead line:', line);
        }
      });

      // Load settings from file
      const settingLines = await fileStorage.readFile('settings.txt');
      settingLines.forEach(line => {
        try {
          const setting = JSON.parse(line);
          this.settings.set(setting.key, setting.value);
        } catch (e) {
          console.error('Error parsing setting line:', line);
        }
      });

      // Create default admin user if no users exist
      if (this.users.size === 0) {
        await this.createUser({
          username: "admin",
          password: "admin123",
          name: "Administrador",
          email: "admin@pagbank.com",
          role: "admin"
        });
      }
    } catch (error) {
      console.error('Error loading data from files:', error);
    }
  }

  private async saveUser(user: User) {
    await fileStorage.appendToFile('users.txt', JSON.stringify(user));
  }

  private async saveCompany(company: Company) {
    await fileStorage.appendToFile('companies.txt', JSON.stringify(company));
  }

  private async saveProposal(proposal: Proposal) {
    await fileStorage.appendToFile('proposals.txt', JSON.stringify(proposal));
  }

  private async saveLead(lead: Lead) {
    await fileStorage.appendToFile('leads.txt', JSON.stringify(lead));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    await this.saveUser(user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllConsultants(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === 'consultant');
  }

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByCnpj(cnpj: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(company => company.cnpj === cnpj);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const company: Company = { 
      ...insertCompany, 
      id,
      createdAt: new Date()
    };
    this.companies.set(id, company);
    await this.saveCompany(company);
    return company;
  }

  // Proposal methods
  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async getProposalsByConsultant(consultantId: number): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter(proposal => proposal.consultantId === consultantId);
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const id = this.currentProposalId++;
    const proposal: Proposal = { 
      id,
      createdAt: new Date(),
      cnpj: insertProposal.cnpj,
      companyName: insertProposal.companyName,
      companySize: insertProposal.companySize,
      consultantId: insertProposal.consultantId || null,
      consultantName: insertProposal.consultantName,
      phone: insertProposal.phone || null,
      pixRate: insertProposal.pixRate || "0.00",
      debitRate: insertProposal.debitRate || "0.51",
      creditRate: insertProposal.creditRate || "1.01",
      credit12xRate: insertProposal.credit12xRate || "1.29",
      anticipationRate: insertProposal.anticipationRate || "2.49",
      status: insertProposal.status || "draft",
    };
    this.proposals.set(id, proposal);
    await this.saveProposal(proposal);
    return proposal;
  }

  async updateProposal(id: number, updateData: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;

    const updatedProposal = { ...proposal, ...updateData };
    this.proposals.set(id, updatedProposal);
    return updatedProposal;
  }

  async getAllProposals(): Promise<Proposal[]> {
    return Array.from(this.proposals.values());
  }

  async deleteProposal(id: number): Promise<boolean> {
    const proposal = this.proposals.get(id);
    if (!proposal) return false;

    this.proposals.delete(id);
    // Remove from file storage
    const allProposals = Array.from(this.proposals.values());
    const proposalLines = allProposals.map(p => JSON.stringify(p));
    await fileStorage.writeFile('proposals.txt', proposalLines);

    return true;
  }

  async deleteAllProposals(): Promise<void> {
    this.proposals.clear();
    // Clear file storage
    await fileStorage.writeFile('proposals.txt', []);
  }

  // Lead methods
  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async getLeadsByConsultant(consultantId: number): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.consultantId === consultantId);
  }

  async getPendingLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.status === 'pending');
  }

  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.currentLeadId++;
    const lead: Lead = { 
      ...insertLead,
      phone: insertLead.phone || null,
      id,
      createdAt: new Date()
    };
    this.leads.set(id, lead);
    await this.saveLead(lead);
    return lead;
  }

  async updateLead(id: number, updateData: Partial<InsertLead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;

    const updatedLead = { ...lead, ...updateData };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  async assignLeadToConsultant(leadId: number, consultantId: number): Promise<Lead | undefined> {
    const lead = this.leads.get(leadId);
    if (!lead) return undefined;

    const updatedLead = { ...lead, consultantId, status: 'assigned' as const };
    this.leads.set(leadId, updatedLead);
    await this.saveLead(updatedLead);
    return updatedLead;
  }

  async updateLeadStatus(leadId: number, status: 'pending' | 'assigned' | 'converted' | 'completed'): Promise<Lead | undefined> {
    const lead = this.leads.get(leadId);
    if (!lead) return undefined;

    const updatedLead = { ...lead, status };
    this.leads.set(leadId, updatedLead);
    await this.saveLead(updatedLead);
    return updatedLead;
  }

  // Settings methods
  private settings: Map<string, any> = new Map();

  async getDefaultRates(): Promise<any> {
    return {
      pixRate: this.settings.get('pixRate') || "0.00",
      debitRate: this.settings.get('debitRate') || "0.51",
      creditRate: this.settings.get('creditRate') || "1.01",
      credit12xRate: this.settings.get('credit12xRate') || "1.29",
      anticipationRate: this.settings.get('anticipationRate') || "1.03",
    };
  }

  async setSetting(setting: { key: string; value: string }): Promise<void> {
    this.settings.set(setting.key, setting.value);
    await fileStorage.appendToFile('settings.txt', JSON.stringify(setting));
  }

  async getWhatsappTemplate(): Promise<string> {
    return this.settings.get('whatsappTemplate') || `🏦 PROPOSTA EXCLUSIVA PAGBANK

Olá! Meu nome é {{consultantName}}, seu novo gerente de conta no PagBank.

📋 Dados da Empresa:
• Empresa: {{companyName}}
• CNPJ: {{cnpj}}
• Status: Ativa
• Porte: {{companySize}}

🎯 OPORTUNIDADE ESPECIAL
Identificamos uma oportunidade de reduzir significativamente suas taxas de vendas no cartão, contribuindo para a retomada do crescimento do seu negócio.

💳 NOVA PROPOSTA DE TAXAS:
• PIX: {{pixRate}}%
• Cartão de Débito: {{debitRate}}%
• Cartão de Crédito à Vista: {{creditRate}}%
• Cartão de Crédito em 12x: {{credit12xRate}}%
• Antecipação de Recebíveis: {{anticipationRate}}%

✅ VANTAGENS INCLUÍDAS:
• Maquininha GRÁTIS
• Conta digital sem taxa de manutenção
• Saque GRÁTIS ilimitado`;
  }

  async setWhatsappTemplate(template: string): Promise<void> {
    this.settings.set('whatsappTemplate', template);
    await fileStorage.appendToFile('settings.txt', JSON.stringify({ key: 'whatsappTemplate', value: template }));
  }
}

export const storage = new MemStorage();