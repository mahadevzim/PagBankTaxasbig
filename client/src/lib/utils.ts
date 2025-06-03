import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCNPJ(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Apply CNPJ formatting
  if (numbers.length <= 14) {
    let formatted = numbers;
    formatted = formatted.replace(/^(\d{2})(\d)/, '$1.$2');
    formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    formatted = formatted.replace(/\.(\d{3})(\d)/, '.$1/$2');
    formatted = formatted.replace(/(\d{4})(\d)/, '$1-$2');
    return formatted;
  }
  
  return value;
}

export function validateCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length !== 14) return false;
  
  // Check for invalid patterns
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validate check digits
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (digit1 !== parseInt(numbers[12])) return false;
  
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return digit2 === parseInt(numbers[13]);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function generateWhatsAppMessage(data: {
  companyName: string;
  cnpj: string;
  companySize: string;
  consultantName: string;
  pixRate: string;
  debitRate: string;
  creditRate: string;
  credit12xRate: string;
}): string {
  return `🏦 PROPOSTA EXCLUSIVA PAGBANK

Olá! Meu nome é ${data.consultantName}, seu novo gerente de conta no PagBank.

📋 Dados da Empresa:
• Empresa: ${data.companyName}
• CNPJ: ${data.cnpj}
• Status: Ativa
• Porte: ${data.companySize}

🎯 OPORTUNIDADE ESPECIAL
Identificamos uma oportunidade de reduzir significativamente suas taxas de vendas no cartão, contribuindo para a retomada do crescimento do seu negócio.

💳 NOVA PROPOSTA DE TAXAS:
• PIX: ${data.pixRate}%
• Cartão de Débito: ${data.debitRate}%
• Cartão de Crédito à Vista: ${data.creditRate}%
• Cartão de Crédito em 12x: ${data.credit12xRate}%

✅ VANTAGENS INCLUÍDAS:
• Maquininha GRÁTIS
• Conta digital sem taxa de manutenção
• Saque GRÁTIS ilimitado`;
}
