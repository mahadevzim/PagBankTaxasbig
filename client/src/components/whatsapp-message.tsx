import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle } from "lucide-react";

interface WhatsAppMessageProps {
  message: string;
  onCopy: () => void;
}

export default function WhatsAppMessage({ message, onCopy }: WhatsAppMessageProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Prévia da Mensagem WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
          {message}
        </div>
        <Button 
          onClick={onCopy}
          className="mt-4 bg-green-600 hover:bg-green-700"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copiar Mensagem
        </Button>
      </CardContent>
    </Card>
  );
}
