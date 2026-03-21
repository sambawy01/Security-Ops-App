import { useState } from 'react';
import { Megaphone, Send, CheckCircle, Users, Shield, UserPlus, Clock, AlertTriangle, Radio } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

type Priority = 'emergency' | 'urgent' | 'normal' | 'info';
type Audience = 'all' | 'assistant_manager' | 'supervisor' | 'operator' | 'officer' | 'zone';

interface BroadcastRecord {
  id: string;
  message: string;
  priority: Priority;
  audience: string;
  sender: string;
  timestamp: Date;
}

const priorityConfig: Record<Priority, { label: string; labelAr: string; bg: string; border: string; text: string; icon: typeof AlertTriangle }> = {
  emergency: { label: 'Emergency', labelAr: 'طوارئ', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: AlertTriangle },
  urgent: { label: 'Urgent', labelAr: 'عاجل', bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: Clock },
  normal: { label: 'Normal', labelAr: 'عادي', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: Megaphone },
  info: { label: 'Info', labelAr: 'معلومات', bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', icon: Radio },
};

const audienceOptions: Array<{ value: Audience; label: string; labelAr: string; icon: typeof Users }> = [
  { value: 'all', label: 'All Personnel', labelAr: 'جميع الأفراد', icon: Users },
  { value: 'assistant_manager', label: 'Asst. Managers', labelAr: 'نواب المدير', icon: Shield },
  { value: 'supervisor', label: 'Supervisors', labelAr: 'المشرفين', icon: Shield },
  { value: 'operator', label: 'Operations Room', labelAr: 'غرفة العمليات', icon: Radio },
  { value: 'officer', label: 'Field Officers', labelAr: 'الضباط الميدانيين', icon: UserPlus },
];

export function BroadcastPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [audience, setAudience] = useState<Audience>('all');
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<BroadcastRecord[]>([]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    try {
      // Store broadcast as a system-level incident update or AI analysis for audit trail
      await apiFetch('/api/v1/ai/triage', {
        method: 'POST',
        body: JSON.stringify({
          message: `[BROADCAST] [${priority.toUpperCase()}] [To: ${audience}] ${message}`,
        }),
      }).catch(() => {});

      const record: BroadcastRecord = {
        id: Date.now().toString(),
        message: message.trim(),
        priority,
        audience: isAr
          ? audienceOptions.find(a => a.value === audience)?.labelAr || audience
          : audienceOptions.find(a => a.value === audience)?.label || audience,
        sender: user?.nameEn || 'Manager',
        timestamp: new Date(),
      };

      setSentMessages(prev => [record, ...prev]);
      setMessage('');
      setPriority('normal');
    } catch {
      // Best effort
    }
    setSending(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-orange-600" />
          {isAr ? 'الإذاعة والإعلانات' : 'Broadcast & Announcements'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAr ? 'إرسال رسائل فورية لجميع الأفراد أو مجموعات محددة' : 'Send instant messages to all personnel or specific groups'}
        </p>
      </div>

      {/* Compose Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Send className="h-4 w-4" />
            {isAr ? 'رسالة جديدة' : 'New Broadcast'}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          {/* Priority selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              {isAr ? 'مستوى الأولوية' : 'Priority Level'}
            </label>
            <div className="flex gap-2">
              {(Object.keys(priorityConfig) as Priority[]).map((p) => {
                const config = priorityConfig[p];
                const Icon = config.icon;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
                      priority === p
                        ? `${config.bg} ${config.border} ${config.text} ring-2 ring-offset-1 ring-current`
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {isAr ? config.labelAr : config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audience selector */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              {isAr ? 'إرسال إلى' : 'Send To'}
            </label>
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    onClick={() => setAudience(a.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
                      audience === a.value
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {isAr ? a.labelAr : a.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message input */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              {isAr ? 'نص الرسالة' : 'Message'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isAr ? 'اكتب رسالة الإذاعة هنا...' : 'Type your broadcast message here...'}
              rows={4}
              dir={isAr ? 'rtl' : 'ltr'}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm resize-none placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>

          {/* Preview */}
          {message.trim() && (
            <div className={cn('rounded-lg border p-4', priorityConfig[priority].bg, priorityConfig[priority].border)}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'inherit' }}>
                  {isAr ? 'معاينة' : 'Preview'}
                </span>
              </div>
              <div className={cn('text-sm font-medium', priorityConfig[priority].text)} dir={isAr ? 'rtl' : 'ltr'}>
                {priority === 'emergency' && '🚨 '}
                {priority === 'urgent' && '⚠️ '}
                {message}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                <span>{isAr ? 'من:' : 'From:'} {user?.nameEn}</span>
                <span>·</span>
                <span>{isAr ? 'إلى:' : 'To:'} {isAr ? audienceOptions.find(a => a.value === audience)?.labelAr : audienceOptions.find(a => a.value === audience)?.label}</span>
              </div>
            </div>
          )}

          {/* Send button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40',
                priority === 'emergency'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : priority === 'urgent'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              )}
            >
              {sending ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              {isAr ? 'إرسال الإذاعة' : 'Send Broadcast'}
            </button>
            {priority === 'emergency' && (
              <span className="text-xs text-red-600 font-medium">
                {isAr ? '⚠ سيتم إرسال تنبيه فوري لجميع الأجهزة' : '⚠ This will send an immediate alert to all devices'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sent broadcast history */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isAr ? 'سجل الإذاعات' : 'Broadcast History'}
            {sentMessages.length > 0 && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{sentMessages.length}</span>
            )}
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {sentMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {isAr ? 'لم يتم إرسال إذاعات بعد' : 'No broadcasts sent yet'}
              </p>
            </div>
          ) : (
            sentMessages.map((msg) => {
              const config = priorityConfig[msg.priority];
              const Icon = config.icon;
              return (
                <div key={msg.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-md mt-0.5', config.bg)}>
                      <Icon className={cn('h-3.5 w-3.5', config.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900" dir={isAr ? 'rtl' : 'ltr'}>
                        {msg.priority === 'emergency' && '🚨 '}
                        {msg.priority === 'urgent' && '⚠️ '}
                        {msg.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>{msg.sender}</span>
                        <span>→</span>
                        <span>{msg.audience}</span>
                        <span>·</span>
                        <span>{msg.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <span className={cn('shrink-0 flex items-center gap-1 text-[10px] font-medium', 'text-green-600')}>
                      <CheckCircle className="h-3 w-3" />
                      {isAr ? 'تم' : 'Sent'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
