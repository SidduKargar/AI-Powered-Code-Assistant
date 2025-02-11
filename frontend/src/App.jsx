import { useState, useEffect } from 'react';
import { 
  Clipboard, 
  Send,
  Code,
  Trash2
} from 'lucide-react';

function App() {
  const [prompt, setPrompt] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // New state for managing animated lines
  const [animatingMessageId, setAnimatingMessageId] = useState(null);
  const [visibleLines, setVisibleLines] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    const newMessage = { role: 'user', content: prompt };
    setConversations([...conversations, newMessage]);

    try {
      const res = await fetch('http://localhost:3001/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const messageId = Date.now().toString();
      const codeLines = data.code.split('\n').map((line, index) => ({
        number: index + 1,
        content: line
      }));

      const assistantMessage = { 
        id: messageId,
        role: 'assistant', 
        content: data.code,
        codeLines: codeLines
      };

      setConversations(prev => [...prev, assistantMessage]);
      setPrompt('');
      
      // Start animation for the new message
      setAnimatingMessageId(messageId);
      setVisibleLines(prev => ({ ...prev, [messageId]: 0 }));
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        id: Date.now().toString(),
        role: 'assistant', 
        content: 'Error generating code. Please try again. ' + error.message,
        isError: true
      };
      setConversations(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Animation effect
  useEffect(() => {
    if (!animatingMessageId) return;

    const message = conversations.find(msg => msg.id === animatingMessageId);
    if (!message || !message.codeLines) return;

    const currentLineCount = visibleLines[animatingMessageId];
    if (currentLineCount >= message.codeLines.length) {
      setAnimatingMessageId(null);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleLines(prev => ({
        ...prev,
        [animatingMessageId]: currentLineCount + 1
      }));
    }, 50); // Adjust timing as needed (50ms between lines)

    return () => clearTimeout(timer);
  }, [animatingMessageId, visibleLines, conversations]);

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInEditor = (content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const clearChat = () => {
    setConversations([]);
    setVisibleLines({});
    setAnimatingMessageId(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header with clear button */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-200">Code Assistant</h1>
          <button
            onClick={clearChat}
            disabled={conversations.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversations.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            Start a new conversation by typing below
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {conversations.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.role === 'assistant' ? 'bg-gray-800' : 'bg-gray-700'
                } rounded-lg p-4`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 ${
                    message.role === 'assistant' 
                      ? 'bg-emerald-500' 
                      : 'bg-gray-500'
                  }`}>
                    <span className="text-white text-sm font-medium">
                      {message.role === 'assistant' ? 'AI' : 'You'}
                    </span>
                  </div>
                  <div className="flex-1 text-gray-200">
                    {message.role === 'assistant' && !message.isError ? (
                      <div className="relative group">
                        <div className="font-mono text-sm bg-gray-900 rounded-lg overflow-hidden">
                          {message.codeLines?.slice(0, visibleLines[message.id] || message.codeLines.length).map(line => (
                            <div key={line.number} className="flex">
                              <div className="px-4 py-1 text-gray-500 select-none bg-gray-800/50 border-r border-gray-700">
                                {line.number}
                              </div>
                              <div className="px-4 py-1 w-full">
                                {line.content || '\u00A0'}
                              </div>
                            </div>
                          ))}
                          {message.id === animatingMessageId && (
                            <div className="px-4 py-1 flex items-center gap-1">
                              <div className="w-2 h-4 bg-emerald-500 animate-pulse" />
                            </div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300"
                          >
                            <Clipboard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openInEditor(message.content)}
                            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300"
                          >
                            <Code className="w-4 h-4" />
                          </button>
                        </div>
                        {copied && (
                          <div className="absolute top-2 right-20 px-2 py-1 bg-emerald-500 text-white rounded text-sm">
                            Copied!
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input form */}
      <div className="bg-gray-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the code you need..."
            rows="1"
            className="flex-1 p-2 rounded-lg bg-gray-700 text-gray-200 border border-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;