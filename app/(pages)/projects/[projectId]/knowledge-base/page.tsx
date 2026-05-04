"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  Send,
  Plus,
  Database,
  FileText,
  Globe,
  Table as TableIcon,
  Trash2,
  MessageSquare,
  Settings2,
  Sparkles,
  User,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import KnowledgeBasePicker from "@/components/form/knowledge-base-picker";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface KnowledgeSource {
  id: string;
  type: "webpage" | "file" | "table";
  name: string;
  status: "processing" | "active" | "error";
  createdAt: Date;
  url?: string;
  size?: number;
}

type ProjectPageProps = {
  params: { projectId: string }; // Remove Promise - now it's resolved by the parent
};

// Helper for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function KnowledgeBase({ params }: ProjectPageProps) {
    const { projectId } = params;
    const [messages, setMessages] = useState<Message[]>([
        {
        id: "1",
        role: "assistant",
        content: "Hello! I'm your knowledge base assistant. I can help you answer questions based on the documents, webpages, and tables you've uploaded. What would you like to know?",
        timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([
        {
        id: "1",
        type: "webpage",
        name: "Documentation",
        status: "active",
        createdAt: new Date(),
        url: "https://docs.example.com",
        },
        {
        id: "2",
        type: "file",
        name: "Product_Guide.pdf",
        status: "active",
        createdAt: new Date(Date.now() - 86400000),
        size: 2450000,
        },
    ]);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response based on knowledge sources
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateResponse(inputValue, knowledgeSources, selectedSourceId),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const generateResponse = (query: string, sources: KnowledgeSource[], selectedId: string | null): string => {
    const activeSources = selectedId 
      ? sources.filter(s => s.id === selectedId && s.status === "active")
      : sources.filter(s => s.status === "active");
    
    if (activeSources.length === 0) {
      return "You haven't added any knowledge sources yet. Click the 'Add Knowledge' button above to upload documents, add webpages, or import tables. Once you add sources, I'll be able to answer questions based on your content.";
    }

    const sourceNames = activeSources.map(s => s.name).join(", ");
    
    if (query.toLowerCase().includes("hello") || query.toLowerCase().includes("hi")) {
      return `Hello! I have access to ${activeSources.length} knowledge source(s): ${sourceNames}. How can I help you today?`;
    }
    
    if (query.toLowerCase().includes("what can you") || query.toLowerCase().includes("help")) {
      return `I can answer questions based on your knowledge sources:\n\n${activeSources.map(s => `• ${s.name} (${s.type})`).join("\n")}\n\nJust ask me anything about the content in these sources, and I'll do my best to help!`;
    }
    
    return `Based on your knowledge sources (${sourceNames}), I can help answer your question about "${query}".\n\nFor a complete response, please make sure your documents are properly indexed. You can manage your knowledge sources from the sidebar on the left.`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddSuccess = () => {
    // In a real app, you'd fetch updated sources from API
    console.log("Knowledge source added successfully");
  };

  const getSourceIcon = (type: KnowledgeSource["type"]) => {
    switch (type) {
      case "webpage":
        return <Globe className="h-4 w-4" />;
      case "file":
        return <FileText className="h-4 w-4" />;
      case "table":
        return <TableIcon className="h-4 w-4" />;
    }
  };

  const getSourceStatusBadge = (status: KnowledgeSource["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500/15 text-green-600 dark:text-green-400 text-xs">Active</Badge>;
      case "processing":
        return <Badge variant="secondary" className="text-xs">Processing</Badge>;
      case "error":
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Sidebar - Knowledge Sources List */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Knowledge Base</h2>
            </div>
            <Button size="sm" onClick={() => setIsPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {knowledgeSources.filter(s => s.status === "active").length} active sources
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {knowledgeSources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No knowledge sources</p>
                <p className="text-xs">Click Add to get started</p>
              </div>
            ) : (
              knowledgeSources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedSourceId(selectedSourceId === source.id ? null : source.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all group",
                    selectedSourceId === source.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-md",
                        selectedSourceId === source.id ? "bg-primary/20" : "bg-muted"
                      )}>
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {getSourceStatusBadge(source.status)}
                          {source.type === "file" && source.size && (
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(source.size)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKnowledgeSources(prev => prev.filter(s => s.id !== source.id));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  {source.type === "webpage" && source.url && (
                    <p className="text-xs text-muted-foreground truncate mt-1 ml-7">
                      {source.url}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t mt-auto">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">AI Context</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedSourceId 
                ? `Searching only in selected source`
                : `Searching across all ${knowledgeSources.filter(s => s.status === "active").length} active sources`}
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Knowledge Assistant</h1>
            {selectedSourceId && (
              <Badge variant="outline" className="ml-2">
                Source: {knowledgeSources.find(s => s.id === selectedSourceId)?.name}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm">
            <Settings2 className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-[10px] opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your knowledge base..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {knowledgeSources.filter(s => s.status === "active").length > 0 
                ? `Answers based on ${knowledgeSources.filter(s => s.status === "active").length} knowledge source(s)`
                : "Add knowledge sources to get answers based on your content"}
            </p>
          </div>
        </div>
      </div>

      {/* Knowledge Base Picker Dialog */}
      <KnowledgeBasePicker
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        projectId={projectId}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}