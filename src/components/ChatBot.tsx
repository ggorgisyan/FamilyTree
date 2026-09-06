import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { FamilyMember } from '../types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  mentionedMemberIds?: string[]
}

interface AskFamilyChatbotResponse {
  reply: string
  mentionedMemberIds: string[]
}

interface ChatBotProps {
  membersMap: Map<string, FamilyMember>
  onNavigate: (id: string) => void
}

function friendlyError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? ''
  if (code.includes('resource-exhausted')) {
    return "You've reached today's question limit — try again tomorrow."
  }
  if (code.includes('unauthenticated')) {
    return 'Please sign in again.'
  }
  return 'Something went wrong, please try again.'
}

export default function ChatBot({ membersMap, onNavigate }: ChatBotProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const history = messages.map(m => ({ role: m.role, content: m.content }))
    const userMessage: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setErrorMessage('')
    setLoading(true)

    try {
      const askFamilyChatbot = httpsCallable<
        { messages: { role: 'user' | 'assistant'; content: string }[] },
        AskFamilyChatbotResponse
      >(functions, 'askFamilyChatbot')
      const result = await askFamilyChatbot({ messages: [...history, { role: 'user', content: text }] })
      const { reply, mentionedMemberIds } = result.data
      setMessages(prev => [...prev, { role: 'assistant', content: reply, mentionedMemberIds }])
    } catch (error) {
      setErrorMessage(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Ask about the family">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} />
          <aside className="panel chat-panel">
            <div className="p-hero" style={{ background: 'linear-gradient(155deg, var(--pine), #123a2f 78%)', padding: '20px 22px' }}>
              <button className="x" onClick={() => setOpen(false)} aria-label="Close">&times;</button>
              <h2 style={{ fontSize: 20 }}>Ask about the family</h2>
            </div>

            <div className="chat-body">
              {messages.length === 0 && (
                <div className="chat-empty">Ask a question about your family history, relationships, or stories.</div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className={`chat-msg ${m.role}`}>{m.content}</div>
                  {m.role === 'assistant' && m.mentionedMemberIds && m.mentionedMemberIds.length > 0 && (
                    <div className="chat-mentions">
                      {m.mentionedMemberIds.map(id => (
                        <button key={id} className="chat-chip" onClick={() => onNavigate(id)}>
                          {membersMap.get(id)?.name ?? id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && <div className="chat-msg assistant">Thinking…</div>}
              {errorMessage && <div className="banner err" style={{ borderRadius: 10 }}>{errorMessage}</div>}
            </div>

            <div className="chat-foot">
              <input
                type="text"
                placeholder="Ask a question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button className="btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
                {loading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
