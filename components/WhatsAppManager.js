'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, Send, RefreshCw, Phone, User, Bot, Copy, Check,
  Settings, AlertCircle, Sparkles, Clock, Users2, Inbox
} from 'lucide-react';

export default function WhatsAppManager({ token }) {
  const [status, setStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        fetch('/api/admin/whatsapp/status', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/admin/whatsapp/conversations', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setStatus(s);
      setConversations(Array.isArray(c) ? c : []);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conv) => {
    setSelected(conv);
    setMessages([]);
    const data = await fetch(`/api/admin/whatsapp/conversations/${conv.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json());
    setMessages(Array.isArray(data?.messages) ? data.messages : []);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: selected.phoneNumber, body: reply }),
      });
      const data = await res.json();
      if (data.success) {
        setReply('');
        await loadMessages(selected);
      } else {
        alert('Errore invio: ' + JSON.stringify(data));
      }
    } finally {
      setSending(false);
    }
  };

  const copyWebhook = () => {
    if (!status?.webhookUrl) return;
    navigator.clipboard.writeText(status.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => { load(); }, []);

  const allConfigured = status?.configured?.phoneNumberId && status?.configured?.accessToken && status?.configured?.llmKey;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-green-600" /> WhatsApp Bot
          </h2>
          <p className="text-gray-500 mt-1">Chatbot AI per WhatsApp Business + risposta automatica con ChatGPT</p>
        </div>
        <Button onClick={load} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Aggiorna
        </Button>
      </div>

      {/* Status / Setup card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Configurazione
          </CardTitle>
          <CardDescription>Stato delle credenziali e URL webhook da configurare su Meta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusPill label="OpenAI/Emergent" ok={status?.configured?.llmKey} />
            <StatusPill label="Phone Number ID" ok={status?.configured?.phoneNumberId} />
            <StatusPill label="Access Token" ok={status?.configured?.accessToken} />
            <StatusPill label="App Secret" ok={status?.configured?.appSecret} />
            <StatusPill label="Verify Token" ok={!!status?.configured?.verifyToken} />
          </div>

          {!allConfigured && (
            <div className="flex gap-2 items-start p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Configurazione incompleta</p>
                <p>Il bot risponde con AI ma non può inviare messaggi su WhatsApp finché non aggiungi le credenziali Meta nel file .env del server.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">URL Webhook (da configurare su Meta Developer Dashboard)</label>
            <div className="flex gap-2">
              <Input value={status?.webhookUrl || ''} readOnly className="font-mono text-xs bg-gray-50" />
              <Button variant="outline" size="sm" onClick={copyWebhook}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Verify Token: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{status?.configured?.verifyToken || '—'}</code>
              {' '}— Model: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{status?.configured?.model || 'gpt-4o-mini'}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users2} label="Conversazioni" value={status?.stats?.conversations || 0} color="ocean" />
        <StatCard icon={MessageCircle} label="Messaggi totali" value={status?.stats?.messages || 0} color="emerald" />
        <StatCard icon={Sparkles} label="Lead generati" value={status?.stats?.leads || 0} color="amber" />
      </div>

      {/* Conversations + chat view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 max-h-[700px] overflow-hidden flex flex-col">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Inbox className="w-4 h-4" /> Conversazioni ({conversations.length})</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                Nessuna conversazione ancora
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map(c => (
                  <button
                    key={c.id}
                    onClick={() => loadMessages(c)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${selected?.id === c.id ? 'bg-ocean-50 border-l-4 border-ocean-500' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {(c.contactName || c.phoneNumber).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{c.contactName || c.phoneNumber}</p>
                          {c.leadCreated && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Lead</Badge>}
                        </div>
                        <p className="text-xs text-gray-500">{c.phoneNumber}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          {new Date(c.lastMessageAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          <span>•</span>
                          <span>{c.messageCount || 0} msg</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 max-h-[700px] overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              {selected ? (
                <>
                  <Phone className="w-4 h-4" />
                  <span>{selected.contactName || selected.phoneNumber}</span>
                  <span className="text-xs text-gray-400 font-normal">({selected.phoneNumber})</span>
                </>
              ) : (
                <span className="text-gray-400">Seleziona una conversazione</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <MessageCircle className="w-16 h-16 mb-3" />
                <p className="text-sm">Clicca su una conversazione per vedere i messaggi</p>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Nessun messaggio</p>
            ) : (
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      m.direction === 'out'
                        ? (m.manual ? 'bg-blue-500 text-white' : 'bg-green-500 text-white')
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] opacity-75">
                        {m.direction === 'out' ? (
                          m.manual ? <><User className="w-3 h-3" /> Operatore</> : <><Bot className="w-3 h-3" /> AI</>
                        ) : (
                          <><User className="w-3 h-3" /> Cliente</>
                        )}
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {selected && (
            <div className="border-t p-3 bg-white">
              <div className="flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Rispondi manualmente come operatore..."
                  disabled={sending}
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} className="bg-green-500 hover:bg-green-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Il messaggio verrà inviato direttamente al cliente (richiede credenziali Meta configurate)</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatusPill({ label, ok }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-400'}`} />
      {label}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    ocean: 'from-ocean-500 to-ocean-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
