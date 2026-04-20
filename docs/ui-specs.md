# hRAG UI Specification: The Control Room

This document defines the static layout and visual design for the hRAG "Control Room" interface. It serves as the primary reference for building the Svelte 5 / shadcn-svelte components.

## 1. Design Tokens (Tailwind Configuration)
*   **Background**: `bg-neutral-950` (Charcoal)
*   **Primary Action**: `text-blue-500` (Signal Blue)
*   **Health/Success**: `text-green-500` (Neon Green)
*   **Warning/Error**: `text-orange-500` (Safety Orange)
*   **Typography**:
    *   UI/Headings: `Plus Jakarta Sans`
    *   Data/Filenames: `IBM Plex Mono`

---

## 2. Core Layout (App Shell)
Every page utilizes a persistent sidebar and a header with technical metadata (Health, Active Node).

### 2.1 Sidebar Navigation
```html
<aside class="w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col h-screen">
  <div class="p-4 border-b border-neutral-800 flex items-center gap-2">
    <div class="w-6 h-6 bg-blue-600 rounded-sm"></div>
    <span class="font-bold tracking-tight text-neutral-100">hRAG <span class="text-blue-500">CONTROL</span></span>
  </div>
  
  <nav class="flex-1 p-4 space-y-6 overflow-y-auto">
    <!-- Intelligence Section -->
    <div>
      <h3 class="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Intelligence</h3>
      <ul class="space-y-1">
        <li class="flex items-center gap-3 p-2 rounded text-neutral-300 bg-neutral-900 cursor-pointer">
          <i class="lucide-message-square w-4 h-4"></i>
          <span class="text-sm">Chat</span>
        </li>
        <li class="flex items-center gap-3 p-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
          <i class="lucide-search w-4 h-4"></i>
          <span class="text-sm">Search Terminal</span>
        </li>
      </ul>
    </div>

    <!-- Operations Section -->
    <div>
      <h3 class="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Operations</h3>
      <ul class="space-y-1">
        <li class="flex items-center gap-3 p-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
          <i class="lucide-file-text w-4 h-4"></i>
          <span class="text-sm">Documents</span>
        </li>
      </ul>
    </div>

    <!-- Administration Section -->
    <div>
      <h3 class="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Administration</h3>
      <ul class="space-y-1">
        <li class="flex items-center gap-3 p-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
          <i class="lucide-users w-4 h-4"></i>
          <span class="text-sm">Users & Groups</span>
        </li>
        <li class="flex items-center gap-3 p-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
          <i class="lucide-activity w-4 h-4"></i>
          <span class="text-sm">System Health</span>
        </li>
        <li class="flex items-center gap-3 p-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
          <i class="lucide-shield w-4 h-4"></i>
          <span class="text-sm">Audit Vault</span>
        </li>
        <li class="flex items-center gap-3 p-2 rounded text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
          <i class="lucide-settings w-4 h-4"></i>
          <span class="text-sm">Settings</span>
        </li>
      </ul>
    </div>
  </nav>

  <div class="p-4 border-t border-neutral-800 bg-neutral-900/50">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold">JD</div>
      <div class="flex-1">
        <p class="text-xs font-medium text-neutral-200">John Doe</p>
        <p class="text-[10px] text-neutral-500 uppercase">Field Manager</p>
      </div>
    </div>
  </div>
</aside>
```

---

## 3. Page Templates

### 3.1 Authentication (Login)
*   **Mandate**: Industrial, minimalist, secure.
*   **Features**: Password toggle, Microsoft/Google placeholders.

```html
<div class="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
  <div class="w-full max-w-sm space-y-8">
    <div class="text-center">
      <div class="mx-auto w-12 h-12 bg-blue-600 rounded-sm mb-4"></div>
      <h1 class="text-2xl font-bold tracking-tight text-neutral-100 font-plus-jakarta">Secure Entry</h1>
      <p class="text-sm text-neutral-500">hRAG Control Authorization Protocol</p>
    </div>

    <form class="space-y-4">
      <div class="space-y-1">
        <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Identity</label>
        <input type="email" placeholder="email@organization.com" class="w-full bg-neutral-900 border border-neutral-800 rounded-sm p-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-colors">
      </div>
      
      <div class="space-y-1 relative">
        <label class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Access Secret</label>
        <input type="password" placeholder="••••••••" class="w-full bg-neutral-900 border border-neutral-800 rounded-sm p-3 text-sm text-neutral-100 outline-none focus:border-blue-500 transition-colors">
        <button type="button" class="absolute right-3 top-8 text-neutral-600 hover:text-neutral-400">
          <i class="lucide-eye w-4 h-4"></i>
        </button>
      </div>

      <button class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-sm text-sm transition-colors uppercase tracking-widest shadow-lg shadow-blue-900/20">Authorize</button>
    </form>

    <div class="relative py-4">
      <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-neutral-800"></span></div>
      <div class="relative flex justify-center text-xs uppercase"><span class="bg-neutral-950 px-2 text-neutral-600 font-bold">Standard Connectors</span></div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <button class="flex items-center justify-center gap-2 border border-neutral-800 p-2 rounded-sm hover:bg-neutral-900 transition-colors">
        <div class="w-4 h-4 bg-neutral-700 rounded-full"></div>
        <span class="text-xs font-bold text-neutral-400">Microsoft</span>
      </button>
      <button class="flex items-center justify-center gap-2 border border-neutral-800 p-2 rounded-sm hover:bg-neutral-900 transition-colors">
        <div class="w-4 h-4 bg-neutral-700 rounded-full"></div>
        <span class="text-xs font-bold text-neutral-400">Google</span>
      </button>
    </div>
  </div>
</div>
```

### 3.2 Search Terminal (Results)
*   **Mandate**: High density, data-first.
*   **Feature**: "Why it matched" preview.

```html
<div class="p-6 space-y-6 h-screen flex flex-col overflow-hidden">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold text-neutral-100">Search <span class="text-blue-500">TERMINAL</span></h2>
    <div class="flex gap-2">
      <button class="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-300 hover:bg-neutral-800 transition-colors">Export CSV</button>
    </div>
  </div>

  <div class="relative flex-1 border border-neutral-800 rounded overflow-hidden flex flex-col bg-neutral-900/20">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-neutral-900/80 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          <th class="p-4 border-b border-neutral-800">Document Name</th>
          <th class="p-4 border-b border-neutral-800">Uploader</th>
          <th class="p-4 border-b border-neutral-800">Classification</th>
          <th class="p-4 border-b border-neutral-800">Score</th>
          <th class="p-4 border-b border-neutral-800">Updated</th>
          <th class="p-4 border-b border-neutral-800">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-800 overflow-y-auto">
        <!-- Result Row -->
        <tr class="hover:bg-blue-500/5 transition-colors group">
          <td class="p-4">
            <div class="flex flex-col">
              <span class="text-sm font-medium text-neutral-200 font-ibm-plex-mono leading-none mb-1">Q4_Report_Confidential.pdf</span>
              <span class="text-[10px] text-neutral-500 italic max-w-md truncate">Matched: "quarterly revenue trends in Asia-Pacific region..."</span>
            </div>
          </td>
          <td class="p-4 text-xs text-neutral-400">s.torrefranca</td>
          <td class="p-4">
            <span class="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-bold border border-orange-500/20">CONFIDENTIAL</span>
          </td>
          <td class="p-4 font-ibm-plex-mono text-xs text-blue-500 font-bold">0.984</td>
          <td class="p-4 text-xs text-neutral-500">2026-04-20</td>
          <td class="p-4">
            <button class="text-neutral-500 hover:text-blue-500 transition-colors">
              <i class="lucide-download w-4 h-4"></i>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### 3.3 Chat Interface (RAG)
*   **Mandate**: Chat history sidebar, context-rich responses.

```html
<div class="flex h-screen overflow-hidden bg-neutral-950">
  <!-- History Sidebar -->
  <aside class="w-64 border-r border-neutral-900 flex flex-col">
    <div class="p-4 border-b border-neutral-900 flex justify-between items-center">
      <span class="text-xs font-bold text-neutral-500 uppercase tracking-widest">History</span>
      <button class="p-1 hover:bg-neutral-900 rounded"><i class="lucide-plus w-3 h-3 text-neutral-400"></i></button>
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div class="p-2 text-xs text-neutral-300 bg-neutral-900 rounded cursor-pointer truncate">Asian Revenue Trends</div>
      <div class="p-2 text-xs text-neutral-500 hover:text-neutral-300 rounded cursor-pointer truncate">SOC2 Audit Checklist</div>
    </div>
  </aside>

  <!-- Chat Area -->
  <main class="flex-1 flex flex-col relative">
    <div class="flex-1 overflow-y-auto p-8 space-y-8">
      <!-- User Message -->
      <div class="flex gap-4 max-w-3xl mx-auto">
        <div class="w-8 h-8 rounded bg-neutral-800 flex-shrink-0"></div>
        <div class="text-sm text-neutral-200">How did our Asian revenue grow in Q4?</div>
      </div>

      <!-- AI Response -->
      <div class="flex gap-4 max-w-3xl mx-auto">
        <div class="w-8 h-8 rounded bg-blue-600 flex-shrink-0 flex items-center justify-center"><i class="lucide-bot w-4 h-4"></i></div>
        <div class="space-y-4 flex-1">
          <p class="text-sm text-neutral-200 leading-relaxed">Asian revenue grew by 14% in Q4, primarily driven by enterprise software licensing in Singapore and Vietnam.</p>
          
          <div class="space-y-2">
            <h4 class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Supporting Evidence</h4>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 border border-neutral-800 rounded bg-neutral-900/50 hover:border-blue-500 transition-colors cursor-pointer group">
                <p class="text-[10px] text-neutral-300 font-ibm-plex-mono truncate mb-1">Q4_Report.pdf (Page 12)</p>
                <p class="text-[9px] text-neutral-600 line-clamp-2 italic group-hover:text-neutral-400">"...Singapore revenue increased from $4.2M to $5.1M..."</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-8 border-t border-neutral-900 bg-neutral-950/80 backdrop-blur">
      <div class="max-w-3xl mx-auto relative">
        <textarea rows="1" placeholder="Query the intelligence vault..." class="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-4 pr-12 text-sm text-neutral-100 outline-none focus:border-blue-500 resize-none transition-colors"></textarea>
        <button class="absolute right-3 bottom-3 p-1.5 bg-blue-600 rounded-md hover:bg-blue-500 transition-colors"><i class="lucide-send w-4 h-4"></i></button>
      </div>
    </div>
  </main>
</div>
```

### 3.4 Documents & Auto-Classification
*   **Mandate**: Operations desk. AI suggestion engine.

```html
<div class="p-6 space-y-6 h-screen flex flex-col overflow-hidden">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold text-neutral-100">Document <span class="text-blue-500">OPERATIONS</span></h2>
    <button class="px-4 py-2 bg-blue-600 rounded text-xs font-bold hover:bg-blue-500 transition-colors uppercase tracking-widest">Upload Files</button>
  </div>

  <div class="flex-1 border border-neutral-800 rounded overflow-hidden flex flex-col bg-neutral-900/20">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-neutral-900/80 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
          <th class="p-4">Resource</th>
          <th class="p-4">Status</th>
          <th class="p-4">AI Suggested Tags</th>
          <th class="p-4">Owner</th>
          <th class="p-4">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-neutral-800 overflow-y-auto">
        <tr>
          <td class="p-4 font-ibm-plex-mono text-xs text-neutral-300">internal_infra_roadmap.md</td>
          <td class="p-4">
            <span class="flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase"><span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Indexing</span>
          </td>
          <td class="p-4 flex gap-2">
            <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/20">ROADMAP</span>
            <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[9px] font-bold border border-blue-500/20 italic cursor-pointer hover:bg-blue-500 hover:text-white transition-colors">INFRASTRUCTURE ?</span>
          </td>
          <td class="p-4 text-xs text-neutral-500 italic">Auto-assigned</td>
          <td class="p-4 flex gap-2">
            <button class="text-neutral-500 hover:text-blue-500"><i class="lucide-check-circle w-4 h-4"></i></button>
            <button class="text-neutral-500 hover:text-orange-500"><i class="lucide-trash w-4 h-4"></i></button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### 3.5 Administration: Users & Roles
*   **Mandate**: The Cockpit. Manager/Staff + Admin/Compliance toggles.

```html
<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold text-neutral-100">User <span class="text-blue-500">AUTHORIZATION</span></h2>
  </div>

  <div class="grid grid-cols-1 border border-neutral-800 rounded divide-y divide-neutral-800 bg-neutral-900/20">
    <!-- User Row -->
    <div class="p-4 flex items-center gap-6">
      <div class="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center font-bold">ST</div>
      <div class="flex-1">
        <p class="text-sm font-bold text-neutral-200">Steve Torrefranca</p>
        <p class="text-[10px] text-neutral-500 font-ibm-plex-mono leading-none">s.torrefranca@gmail.com</p>
      </div>
      
      <!-- Multi-Role Matrix -->
      <div class="flex items-center gap-8">
        <div class="space-y-1 flex flex-col items-center">
          <span class="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Level</span>
          <select class="bg-neutral-900 border border-neutral-700 rounded text-[10px] p-1 text-neutral-200 outline-none">
            <option>MANAGER</option>
            <option>STAFF</option>
          </select>
        </div>
        <div class="space-y-1 flex flex-col items-center">
          <span class="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Admin</span>
          <input type="checkbox" checked class="accent-blue-500">
        </div>
        <div class="space-y-1 flex flex-col items-center opacity-50">
          <span class="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Compliance</span>
          <input type="checkbox" checked disabled class="accent-blue-500">
        </div>
      </div>
      
      <button class="p-2 text-neutral-500 hover:text-orange-500"><i class="lucide-user-x w-4 h-4"></i></button>
    </div>
  </div>
</div>
```
