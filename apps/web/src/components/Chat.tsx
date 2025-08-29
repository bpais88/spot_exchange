'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, User, X } from 'lucide-react'
import { sanitizeNotes, escapeHtml } from '@/lib/sanitization'

interface Message {
  id: string
  content: string
  senderId: string
  senderName?: string
  timestamp: string
  isCurrentUser: boolean
}

interface ChatProps {
  opportunityId: string
  currentUserId?: string
  onClose?: () => void
}

export default function Chat({ opportunityId, currentUserId, onClose }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!opportunityId) return
    
    loadMessages()
    
    // Set up real-time subscription
    const setupSubscription = async () => {
      const { supabase } = await import('@/lib/supabase')
      
      const subscription = supabase
        .channel(`messages-${opportunityId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `opportunity_id=eq.${opportunityId}`,
          },
          (payload) => {
            console.log('New message:', payload)
            // Add the new message to the list
            const newMsg = payload.new as any
            const message: Message = {
              id: newMsg.id,
              content: newMsg.content,
              senderId: newMsg.sender_id,
              timestamp: newMsg.created_at,
              isCurrentUser: newMsg.sender_id === currentUserId
            }
            setMessages(prev => [...prev, message])
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
    
    const cleanup = setupSubscription()
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.())
    }
  }, [opportunityId, currentUserId])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      const transformedMessages: Message[] = messagesData?.map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_id,
        timestamp: msg.created_at,
        isCurrentUser: msg.sender_id === currentUserId
      })) || []

      setMessages(transformedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      
      const { error } = await supabase
        .from('messages')
        .insert({
          opportunity_id: opportunityId,
          sender_id: currentUserId,
          content: newMessage.trim()
        })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message')
        return
      }

      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups: any, message) => {
    const date = formatDate(message.timestamp)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Messages - Opportunity #{opportunityId.slice(0, 8)}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, dateMessages]: [string, any]) => (
              <div key={date}>
                <div className="text-center my-4">
                  <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                {dateMessages.map((message: Message) => (
                  <div
                    key={message.id}
                    className={`flex mb-3 ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isCurrentUser
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {message.isCurrentUser ? 'You' : 'Other User'}
                        </span>
                        <span className="text-xs opacity-75">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{escapeHtml(message.content)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(sanitizeNotes(e.target.value))}
              placeholder="Type your message..."
              className="flex-1 form-input"
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              className="btn-primary"
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}