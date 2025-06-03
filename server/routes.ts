import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertCompanySchema, insertProposalSchema, insertLeadSchema, insertSettingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CNPJ lookup route
  app.post("/api/cnpj-lookup", async (req, res) => {
    try {
      const { cnpj, phone } = req.body;
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      
      // Check if company exists in local storage
      let company = await storage.getCompanyByCnpj(cleanCNPJ);
      
      if (!company) {
        // Try to fetch from external API
        try {
          const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
          const data = await response.json();
          
          if (data.status === 'OK') {
            company = await storage.createCompany({
              cnpj: data.cnpj,
              name: data.nome || data.fantasia,
              status: data.situacao,
              size: data.porte,
              activity: data.atividade_principal?.[0]?.text,
              openDate: data.abertura
            });
          } else {
            return res.status(404).json({ message: "CNPJ not found" });
          }
        } catch (apiError) {
          return res.status(404).json({ message: "Error fetching CNPJ data" });
        }
      }

      // Create lead for CNPJ lookup with phone
      await storage.createLead({
        cnpj: company.cnpj,
        companyName: company.name,
        phone: phone || null,
        status: 'pending'
      });

      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CNPJ lookup route (legacy GET route for direct URL access)
  app.get("/api/cnpj/:cnpj", async (req, res) => {
    try {
      const { cnpj } = req.params;
      
      // Check if company exists in local storage
      let company = await storage.getCompanyByCnpj(cnpj);
      
      if (!company) {
        // Try to fetch from external API
        try {
          const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj.replace(/\D/g, '')}`);
          const data = await response.json();
          
          if (data.status === 'OK') {
            company = await storage.createCompany({
              cnpj: data.cnpj,
              name: data.nome || data.fantasia,
              status: data.situacao,
              size: data.porte,
              activity: data.atividade_principal?.[0]?.text,
              openDate: data.abertura
            });
          } else {
            return res.status(404).json({ message: "CNPJ not found" });
          }
        } catch (apiError) {
          return res.status(404).json({ message: "Error fetching CNPJ data" });
        }
      }

      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/consultants", async (req, res) => {
    try {
      const consultants = await storage.getAllConsultants();
      const consultantsWithoutPasswords = consultants.map(({ password, ...user }) => user);
      res.json(consultantsWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      if (success) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Proposal routes
  app.post("/api/proposals", async (req, res) => {
    try {
      const proposalData = insertProposalSchema.parse(req.body);
      const proposal = await storage.createProposal(proposalData);
      res.json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      const proposals = await storage.getAllProposals();
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/proposals/:id/pdf", async (req, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const proposal = await storage.getProposal(proposalId);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      const formatCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      };

      const pdfHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Proposta PagBank - ${proposal.companyName}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #00a859;
            padding-bottom: 20px;
        }
        .logo {
            color: #00a859;
            font-size: 24px;
            font-weight: bold;
        }
        .company-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .rates-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .rates-table th,
        .rates-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .rates-table th {
            background-color: #00a859;
            color: white;
        }
        .rates-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .consultant-info {
            margin-top: 30px;
            padding: 15px;
            background: #e8f5e8;
            border-radius: 8px;
        }
        .print-btn {
            background: #00a859;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .print-btn:hover {
            background: #008a47;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">Imprimir / Salvar como PDF</button>
    
    <div class="header">
        <img src="/attached_assets/Logo_PagBank.png" alt="PagBank" style="height: 60px; margin-bottom: 10px;">
        <h1>Proposta Comercial</h1>
        <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>

    <div class="company-info">
        <h2>Dados da Empresa</h2>
        <p><strong>Razão Social:</strong> ${proposal.companyName}</p>
        <p><strong>CNPJ:</strong> ${formatCNPJ(proposal.cnpj)}</p>
        ${proposal.phone ? `<p><strong>Telefone:</strong> ${proposal.phone}</p>` : ''}
    </div>

    <h2>Taxas Propostas</h2>
    <table class="rates-table">
        <thead>
            <tr>
                <th>Modalidade de Pagamento</th>
                <th>Taxa (%)</th>
                <th>Descrição</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>PIX</td>
                <td>${proposal.pixRate}%</td>
                <td>Transferência instantânea</td>
            </tr>
            <tr>
                <td>Cartão de Débito</td>
                <td>${proposal.debitRate}%</td>
                <td>Débito à vista</td>
            </tr>
            <tr>
                <td>Cartão de Crédito à Vista</td>
                <td>${proposal.creditRate}%</td>
                <td>Crédito à vista</td>
            </tr>
            <tr>
                <td>Cartão de Crédito 12x</td>
                <td>${proposal.credit12xRate}%</td>
                <td>Parcelado em 12 vezes</td>
            </tr>
            <tr>
                <td>Antecipação de Recebíveis</td>
                <td>${proposal.anticipationRate}%</td>
                <td>Antecipação do valor</td>
            </tr>
        </tbody>
    </table>

    <div class="consultant-info">
        <h3>Consultor Responsável</h3>
        <p><strong>${proposal.consultantName}</strong></p>
        <p>Entre em contato para finalizar a contratação e esclarecer dúvidas.</p>
    </div>

    <div class="footer">
        <p>Esta proposta é válida por 30 dias a partir da data de emissão.</p>
        <p>PagBank - Soluções de Pagamento</p>
    </div>

    <script>
        // Auto-focus for printing
        window.addEventListener('load', function() {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('print') === 'true') {
                setTimeout(() => window.print(), 500);
            }
        });
    </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(pdfHTML);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/proposals/consultant/:consultantId", async (req, res) => {
    try {
      const consultantId = parseInt(req.params.consultantId);
      const proposals = await storage.getProposalsByConsultant(consultantId);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/proposals/:id", async (req, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const success = await storage.deleteProposal(proposalId);
      if (success) {
        res.json({ message: "Proposal deleted successfully" });
      } else {
        res.status(404).json({ message: "Proposal not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/proposals", async (req, res) => {
    try {
      await storage.deleteAllProposals();
      res.json({ message: "All proposals deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Lead routes
  app.get("/api/leads/pending", async (req, res) => {
    try {
      const leads = await storage.getPendingLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leads/all", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/leads/consultant/:consultantId", async (req, res) => {
    try {
      const consultantId = parseInt(req.params.consultantId);
      const leads = await storage.getLeadsByConsultant(consultantId);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/leads/:id/assign", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const { consultantId } = req.body;
      const lead = await storage.assignLeadToConsultant(leadId, consultantId);
      if (lead) {
        res.json(lead);
      } else {
        res.status(404).json({ message: "Lead not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/leads/:id/status", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const { status } = req.body;
      const lead = await storage.updateLeadStatus(leadId, status);
      if (lead) {
        res.json(lead);
      } else {
        res.status(404).json({ message: "Lead not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate WhatsApp message
  app.post("/api/whatsapp-message", async (req, res) => {
    try {
      const { companyName, cnpj, companySize, consultantName, pixRate, debitRate, creditRate, credit12xRate, anticipationRate } = req.body;
      
      // Get custom template
      const template = await storage.getWhatsappTemplate();
      
      // Replace placeholders with actual values
      const message = template
        .replace(/\{\{consultantName\}\}/g, consultantName || '')
        .replace(/\{\{companyName\}\}/g, companyName || '')
        .replace(/\{\{cnpj\}\}/g, cnpj || '')
        .replace(/\{\{companySize\}\}/g, companySize || '')
        .replace(/\{\{pixRate\}\}/g, pixRate || '')
        .replace(/\{\{debitRate\}\}/g, debitRate || '')
        .replace(/\{\{creditRate\}\}/g, creditRate || '')
        .replace(/\{\{credit12xRate\}\}/g, credit12xRate || '')
        .replace(/\{\{anticipationRate\}\}/g, anticipationRate || '');

      res.json({ message });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // WhatsApp template routes
  app.get("/api/settings/whatsapp-template", async (req, res) => {
    try {
      const template = await storage.getWhatsappTemplate();
      res.json({ template });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/settings/whatsapp-template", async (req, res) => {
    try {
      const { template } = req.body;
      await storage.setWhatsappTemplate(template);
      res.json({ message: "WhatsApp template updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Settings routes
  app.get("/api/settings/default-rates", async (req, res) => {
    try {
      const rates = await storage.getDefaultRates();
      res.json(rates);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/settings/default-rates", async (req, res) => {
    try {
      const { pixRate, debitRate, creditRate, credit12xRate, anticipationRate } = req.body;
      
      const rateSettings = [
        { key: 'pixRate', value: pixRate },
        { key: 'debitRate', value: debitRate },
        { key: 'creditRate', value: creditRate },
        { key: 'credit12xRate', value: credit12xRate },
        { key: 'anticipationRate', value: anticipationRate },
      ];

      for (const setting of rateSettings) {
        await storage.setSetting(setting);
      }

      res.json({ message: "Default rates updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Auto-fill company data by CNPJ
  app.post("/api/cnpj-autofill", async (req, res) => {
    try {
      const { cnpj } = req.body;
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      
      // Check if company exists in local storage
      let company = await storage.getCompanyByCnpj(cleanCNPJ);
      
      if (!company) {
        // Try to fetch from external API
        try {
          const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
          const data = await response.json();
          
          if (data.status === 'OK') {
            company = await storage.createCompany({
              cnpj: data.cnpj,
              name: data.nome || data.fantasia,
              status: data.situacao,
              size: data.porte,
              activity: data.atividade_principal?.[0]?.text,
              openDate: data.abertura
            });
          } else {
            return res.status(404).json({ message: "CNPJ not found" });
          }
        } catch (apiError) {
          return res.status(404).json({ message: "Error fetching CNPJ data" });
        }
      }

      // Get default rates
      const defaultRates = await storage.getDefaultRates();

      res.json({
        company,
        defaultRates
      });
    } catch (error) {
      console.error('Error in cnpj-autofill:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
